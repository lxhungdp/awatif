import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import van, { type State } from "vanjs-core";
import {
  JSCAD_GRID_MAJOR_LINE_WIDTH_PX,
  JSCAD_GRID_MAJOR_MINOR_RATIO,
  JSCAD_GRID_MINOR_LINE_WIDTH_PX,
  getViewerGridMajorLineMaterialProps,
  getViewerGridMinorLineMaterialProps,
} from "../jscadLightTheme";

export type Grid = {
  visible: State<boolean>;
  spacing: State<number>;
};

/** Major lines sit slightly toward the camera (+Z) so they stay visually on top of minor at crossings (openjscad.xyz-style). */
const GRID_MAJOR_Z_BIAS = 0.002;

/**
 * Fixed world patch: this many major spacings along X and along Y (centered on orbit target).
 * Same in 2D and 3D so the grid never fills an “infinite” frustum when zooming out.
 */
const GRID_MAJORS_ACROSS = 20;

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

/** GRID_MAJORS_ACROSS major intervals across width and height, centered on target. */
function boundedGridXY(
  target: THREE.Vector3,
  minorStep: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const majorStep = minorStep * JSCAD_GRID_MAJOR_MINOR_RATIO;
  const halfSpan = (GRID_MAJORS_ACROSS / 2) * majorStep;
  const cx = target.x;
  const cy = target.y;
  return {
    minX: cx - halfSpan,
    maxX: cx + halfSpan,
    minY: cy - halfSpan,
    maxY: cy + halfSpan,
  };
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
  controls,
  rendererDomElement,
  render,
}: {
  grid: Grid;
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
    const b = boundedGridXY(controls.target, minorStep);
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
      ...getViewerGridMinorLineMaterialProps(),
      linewidth: JSCAD_GRID_MINOR_LINE_WIDTH_PX,
      resolution: res,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });

    const majorMat = new LineMaterial({
      ...getViewerGridMajorLineMaterialProps(),
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

    /* World-fixed XY grid at Z=0 — pan moves target; grid stays a fixed world patch around target. */
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
