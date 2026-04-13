import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Geometry,
  Mesh,
  Components,
  templates as Templates,
} from "@awatif/components";
import { getGrid } from "./grid/getGrid";
import { getGeometry } from "./geometry/getGeometry";
import { getMesh } from "./mesh/getMesh";
import { getLoads } from "./loads/getLoads";
import { getSupports } from "./supports/getSupports";
import { getReleases } from "./releases/getReleases";
import { getMemberIndex } from "./memberIndex/getMemberIndex";
import { getPointResults } from "./pointResult/getPointResults";
import { getLineResults } from "./lineResult/getLineResults";
import { getExtrudeSections } from "./extrudeSections/getExtrudeSections";
import { getExtrudeSectionAnimation } from "./extrudeSections/getExtrudeSectionAnimation";
import { getViewerSettings } from "./settings/getViewerSettings";
import van from "vanjs-core";
import { Display } from "../display/getDisplay";
import { WORKSPACE_EXTENT } from "./workspaceExtent";
import {
  getJscadLightBackgroundCss,
  getJscadLightSceneBackground,
} from "./jscadLightTheme";
import { createFilledCircleTexture } from "./screenSpaceMarkers";
import { VIEWER_POINT_DISPLAY_PX } from "./pointDisplayPx";

import "./style.css";

export function getViewer({
  geometry,
  mesh,
  components,
  display,
  templates,
}: {
  geometry?: Geometry;
  mesh?: Mesh;
  components?: Components;
  display: Display;
  templates?: typeof Templates;
}): HTMLDivElement {
  const scene = new THREE.Scene();
  scene.background = getJscadLightSceneBackground();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.up.set(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  let render: () => void;

  const container = document.createElement("div");
  container.id = "viewer";
  container.style.background = getJscadLightBackgroundCss();
  container.appendChild(renderer.domElement);
  container.appendChild(getViewerSettings(display, geometry));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  /* AutoCAD-style: middle button pan; right = zoom (dolly). Wheel unchanged. */
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.DOLLY,
  };

  const grid = display.grid;
  const displayScale = display.displayScale;

  const zCam = 8 * (WORKSPACE_EXTENT / 10);
  camera.position.set(0, 0, zCam);
  controls.target.set(0, 0, 0);
  controls.update();

  /* Same as blue nodes: Points + circle texture, fixed screen px (no Sprite distance scaling bug). */
  const ORIGIN_DOT_Z = 0.008;
  const originMap = createFilledCircleTexture("#ff0000");
  const originGeometry = new THREE.BufferGeometry();
  originGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, ORIGIN_DOT_Z], 3),
  );
  const originDot = new THREE.Points(
    originGeometry,
    new THREE.PointsMaterial({
      map: originMap,
      color: 0xff0000,
      transparent: true,
      alphaTest: 0.01,
      size: VIEWER_POINT_DISPLAY_PX,
      sizeAttenuation: false,
      depthTest: true,
      depthWrite: false,
    }),
  );
  originDot.renderOrder = 10;
  scene.add(originDot);

  let geoGroupForSync: THREE.Group | null = null;

  render = () => {
    const sync = (
      geoGroupForSync?.userData as { syncNodeLabels?: () => void }
    )?.syncNodeLabels;
    sync?.();
    renderer.render(scene, camera);
  };

  const applyViewMode = () => {
    const is3d = display.viewMode.val === "3d";
    controls.enableRotate = is3d;
    if (!is3d) {
      camera.position.set(0, 0, zCam);
      controls.target.set(0, 0, 0);
      controls.update();
    }
    render();
  };

  van.derive(() => {
    void display.viewMode.val;
    applyViewMode();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
  });
  controls.addEventListener("change", render);

  scene.add(
    getGrid({
      grid,
      controls,
      rendererDomElement: renderer.domElement,
      render,
    }),
  );

  if (geometry) {
    geoGroupForSync = getGeometry({
      geometry,
      grid,
      displayScale,
      camera,
      rendererElm: renderer.domElement,
      render,
      display,
    });
    scene.add(geoGroupForSync);
  }

  if (mesh) {
    scene.add(
      getMesh({
        mesh,
        render,
        display,
      }),
    );

    scene.add(
      getPointResults({
        mesh,
        display: display.pointResult,
        displayScale,
        render,
      }),
    );

    scene.add(
      getLineResults({
        mesh,
        display: display.lineResult,
        displayScale,
        render,
      }),
    );
  }

  if (components && geometry && templates) {
    scene.add(
      getLoads({
        geometry,
        components,
        templates,
        displayScale,
        render,
        display,
      }),
    );

    scene.add(
      getSupports({
        geometry,
        components,
        templates,
        displayScale,
        render,
        display,
      }),
    );

    scene.add(
      getReleases({
        geometry,
        components,
        templates,
        displayScale,
        render,
        display,
      }),
    );

    scene.add(
      getMemberIndex({
        geometry,
        displayScale,
        render,
        display,
      }),
    );

    scene.add(
      getExtrudeSections({
        geometry,
        components,
        templates,
        display: display.extrudeSections,
        render,
      }),
    );

    getExtrudeSectionAnimation({
      camera,
      controls,
      display,
      render,
    });
  }

  render();

  return container;
}
