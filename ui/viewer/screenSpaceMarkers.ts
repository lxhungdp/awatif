import * as THREE from "three";

/**
 * Textures for screen-stable markers (Sprite / Points with sizeAttenuation: false).
 * Shapes stay circle / square when panning or zooming (no perspective foreshortening).
 */

export function createFilledCircleTexture(
  fillStyle: string,
  size = 64,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** White square on transparent — tint with PointsMaterial.color / SpriteMaterial.color */
export function createFilledSquareTexture(size = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const m = Math.floor(size * 0.12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(m, m, size - 2 * m, size - 2 * m);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
