import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import van, { State } from "vanjs-core";
import {
  JSCAD_GRID_MAJOR_LINE_WIDTH_PX,
  JSCAD_GRID_MAJOR_MINOR_RATIO,
  JSCAD_GRID_MINOR_LINE_WIDTH_PX,
  JSCAD_LIGHT_GRID_MAJOR_HEX,
  JSCAD_LIGHT_GRID_MINOR_HEX,
} from "../jscadLightTheme";

export type Grid = {
  visible: State<boolean>;
  spacing: State<number>;
};

const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hit = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

/** Major lines sit slightly toward the camera (+Z) so they stay visually on top of minor at crossings (openjscad.xyz-style). */
const GRID_MAJOR_Z_BIAS = 0.002;

/**
 * World-axis-aligned bounds on Z=0 of the frustum footprint (with margin).
 * Grid lines use world coordinates so panning only moves the camera — grid stays registered to the model (AutoCAD-style).
 */
function visibleWorldXYBoundsOnZPlane(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  target: THREE.Vector3,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const rect = domElement.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return fallbackXYBounds(camera, target);
  }

  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const xs: number[] = [];
  const ys: number[] = [];

  for (const [nx, ny] of corners) {
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const ok = raycaster.ray.intersectPlane(zPlane, hit);
    if (ok) {
      xs.push(hit.x);
      ys.push(hit.y);
    }
  }

  if (xs.length >= 2) {
    const margin = 1.15;
    const minX0 = Math.min(...xs);
    const maxX0 = Math.max(...xs);
    const minY0 = Math.min(...ys);
    const maxY0 = Math.max(...ys);
    const cx = (minX0 + maxX0) / 2;
    const cy = (minY0 + maxY0) / 2;
    const halfW = ((maxX0 - minX0) / 2) * margin;
    const halfH = ((maxY0 - minY0) / 2) * margin;
    return {
      minX: cx - Math.max(halfW, 0.5),
      maxX: cx + Math.max(halfW, 0.5),
      minY: cy - Math.max(halfH, 0.5),
      maxY: cy + Math.max(halfH, 0.5),
    };
  }

  return fallbackXYBounds(camera, target);
}

function fallbackXYBounds(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const p = camera.position;
  const dist = Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z);
  const vFov = (camera.fov * Math.PI) / 180;
  const halfH = Math.tan(vFov / 2) * dist * 1.2;
  const halfW = Math.max(halfH * camera.aspect, 1);
  const h = Math.max(halfH, 1);
  return {
    minX: target.x - halfW,
    maxX: target.x + halfW,
    minY: target.y - h,
    maxY: target.y + h,
  };
}

function isOnMajorStep(coord: number, majorStep: number): boolean {
  if (majorStep <= 1e-12) return false;
  const k = coord / majorStep;
  return Math.abs(k - Math.round(k)) < 1e-4;
}

/**
 * World-space grid on Z=0: lines at multiples of minorStep in X/Y (OpenJSCAD-style major/minor ratio).
 */
function buildWorldGridSegmentArrays(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minorStep: number,
): { major: number[]; minor: number[] } {
  const majorStep = minorStep * JSCAD_GRID_MAJOR_MINOR_RATIO;
  const major: number[] = [];
  const minor: number[] = [];

  const nX0 = Math.ceil(minX / minorStep - 1e-10);
  const nX1 = Math.floor(maxX / minorStep + 1e-10);
  for (let n = nX0; n <= nX1; n++) {
    const x = n * minorStep;
    const bucket = isOnMajorStep(x, majorStep) ? major : minor;
    bucket.push(x, minY, 0, x, maxY, 0);
  }

  const nY0 = Math.ceil(minY / minorStep - 1e-10);
  const nY1 = Math.floor(maxY / minorStep + 1e-10);
  for (let n = nY0; n <= nY1; n++) {
    const y = n * minorStep;
    const bucket = isOnMajorStep(y, majorStep) ? major : minor;
    bucket.push(minX, y, 0, maxX, y, 0);
  }

  return { major, minor };
}

function disposeLineSegments2(obj: LineSegments2 | null) {
  if (!obj) return;
  obj.geometry.dispose();
  (obj.material as LineMaterial).dispose();
}

function makeLineSegmentsLayer(
  positions: number[],
  material: LineMaterial,
): LineSegments2 | null {
  if (positions.length < 6) return null;
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  return new LineSegments2(geom, material);
}

export function getGrid({
  grid,
  camera,
  controls,
  rendererDomElement,
  render,
}: {
  grid: Grid;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  rendererDomElement: HTMLCanvasElement;
  render: () => void;
}): THREE.Group {
  const group = new THREE.Group();
  let minorLayer: LineSegments2 | null = null;
  let majorLayer: LineSegments2 | null = null;

  const rebuild = () => {
    disposeLineSegments2(minorLayer);
    disposeLineSegments2(majorLayer);
    group.clear();
    minorLayer = null;
    majorLayer = null;

    if (!grid.visible.val) {
      render();
      return;
    }

    const minorStep = Math.max(0.5, grid.spacing.val);
    const b = visibleWorldXYBoundsOnZPlane(
      camera,
      rendererDomElement,
      controls.target,
    );
    const { major, minor } = buildWorldGridSegmentArrays(
      b.minX,
      b.maxX,
      b.minY,
      b.maxY,
      minorStep,
    );

    const w = rendererDomElement.clientWidth;
    const h = rendererDomElement.clientHeight;
    const res = new THREE.Vector2(w, h);

    const minorMat = new LineMaterial({
      color: JSCAD_LIGHT_GRID_MINOR_HEX,
      linewidth: JSCAD_GRID_MINOR_LINE_WIDTH_PX,
      resolution: res,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });

    const majorMat = new LineMaterial({
      color: JSCAD_LIGHT_GRID_MAJOR_HEX,
      linewidth: JSCAD_GRID_MAJOR_LINE_WIDTH_PX,
      resolution: res,
      polygonOffset: true,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: 0,
    });

    minorLayer = makeLineSegmentsLayer(minor, minorMat);
    majorLayer = makeLineSegmentsLayer(major, majorMat);

    if (minorLayer) {
      minorLayer.position.z = 0;
      minorLayer.renderOrder = 0;
      group.add(minorLayer);
    }
    if (majorLayer) {
      majorLayer.position.z = GRID_MAJOR_Z_BIAS;
      majorLayer.renderOrder = 1;
      group.add(majorLayer);
    }

    /* World-fixed XY grid at Z=0 — pan = camera only; group stays at origin. */
    group.position.set(0, 0, 0);

    render();
  };

  van.derive(() => {
    grid.visible.val;
    grid.spacing.val;
    rebuild();
  });

  const onCameraChange = () => rebuild();
  controls.addEventListener("change", onCameraChange);
  window.addEventListener("resize", onCameraChange);

  return group;
}
