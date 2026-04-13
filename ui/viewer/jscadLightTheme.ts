import * as THREE from "three";

/**
 * Viewer theme: background + grid line RGB colors.
 *
 * --- Previous OpenJSCAD-style on pure white (restore if needed) ---
 * export function getJscadLightSceneBackground(): THREE.Color {
 *   return new THREE.Color(1, 1, 1);
 * }
 * export const JSCAD_LIGHT_GRID_MAJOR_HEX = 0x8a8a8a;
 * export const JSCAD_LIGHT_GRID_MINOR_HEX = 0xe2e2e2;
 * // CSS background matched scene via getHexString() → #ffffff
 */

/** Canvas / scene background, RGB 0–255 */
export const VIEWER_BACKGROUND_RGB = [245, 245, 245] as const;

export function getJscadLightSceneBackground(): THREE.Color {
  const [r, g, b] = VIEWER_BACKGROUND_RGB;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

/** Minor grid line RGB 0–255 (opaque) */
export const VIEWER_GRID_MINOR_RGB = [128, 128, 128] as const;

/** Major grid line RGB 0–255 (opaque) */
export const VIEWER_GRID_MAJOR_RGB = [90, 90, 90] as const;

function rgbToLineMaterialProps(rgb: readonly [number, number, number]): {
  color: number;
  transparent: boolean;
  opacity: number;
} {
  const [r, g, b] = rgb;
  const c = new THREE.Color(r / 255, g / 255, b / 255);
  return {
    color: c.getHex(),
    transparent: false,
    opacity: 1,
  };
}

export function getViewerGridMinorLineMaterialProps(): {
  color: number;
  transparent: boolean;
  opacity: number;
} {
  return rgbToLineMaterialProps(VIEWER_GRID_MINOR_RGB);
}

export function getViewerGridMajorLineMaterialProps(): {
  color: number;
  transparent: boolean;
  opacity: number;
} {
  return rgbToLineMaterialProps(VIEWER_GRID_MAJOR_RGB);
}

/** Screen-space line width — slightly heavier than minor so major reads */
export const JSCAD_GRID_MAJOR_LINE_WIDTH_PX = 1.0;

/** Minor grid (screen px); keep below major for hierarchy */
export const JSCAD_GRID_MINOR_LINE_WIDTH_PX = 0.5;

/**
 * Major : minor spacing ratio — @jscad/web viewer `ticks: [10, 1]` (coarse : fine).
 */
export const JSCAD_GRID_MAJOR_MINOR_RATIO = 10;

/** CSS #rgb for div behind the canvas (matches scene background) */
export function getJscadLightBackgroundCss(): string {
  return `#${getJscadLightSceneBackground().getHexString()}`;
}
