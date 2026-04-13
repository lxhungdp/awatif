import * as THREE from "three";

/**
 * OpenJSCAD Light-style grid on white: fine minor lines (thin, light grey) and
 * coarse major lines (bolder, darker grey). Matches openjscad.xyz appearance
 * more closely than raw theme JSON (black + blue alpha).
 * @see https://openjscad.xyz/
 */
/** Light theme rendering.background [1, 1, 1, 1] */
export function getJscadLightSceneBackground(): THREE.Color {
  return new THREE.Color(1, 1, 1);
}

/** Major grid (every N× minor step): darker grey, drawn bolder */
export const JSCAD_LIGHT_GRID_MAJOR_HEX = 0x8a8a8a;

/** Minor grid (every user spacing): light grey, drawn thinner */
export const JSCAD_LIGHT_GRID_MINOR_HEX = 0xe2e2e2;

/** Screen-space line width — slightly heavier than minor so major reads without looking thick */
export const JSCAD_GRID_MAJOR_LINE_WIDTH_PX = 1.25;

export const JSCAD_GRID_MINOR_LINE_WIDTH_PX = 1;

/**
 * Major : minor spacing ratio — @jscad/web viewer `ticks: [10, 1]` (coarse : fine).
 */
export const JSCAD_GRID_MAJOR_MINOR_RATIO = 10;

/** @deprecated use JSCAD_LIGHT_GRID_MAJOR_HEX */
export function getJscadLightGridCenterHex(): number {
  return JSCAD_LIGHT_GRID_MAJOR_HEX;
}

/** @deprecated use JSCAD_LIGHT_GRID_MINOR_HEX */
export function getJscadLightGridLinesHex(): number {
  return JSCAD_LIGHT_GRID_MINOR_HEX;
}

/** CSS #rgb for div behind the canvas */
export function getJscadLightBackgroundCss(): string {
  return `#${getJscadLightSceneBackground().getHexString()}`;
}
