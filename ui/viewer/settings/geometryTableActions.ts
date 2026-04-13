import type { Geometry } from "@awatif/components";

function getNextMapId<T>(items: ReadonlyMap<number, T>): number {
  if (items.size === 0) return 1;
  return Math.max(...items.keys()) + 1;
}

export function addNodeToGeometry(
  geometry: Geometry,
  x: number,
  y: number,
  z = 0,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
    return false;
  const pts = geometry.points.rawVal;
  const id = getNextMapId(pts);
  const m = new Map(pts);
  m.set(id, [x, y, z]);
  geometry.points.val = m;
  return true;
}

export function addLineToGeometry(
  geometry: Geometry,
  iNode: number,
  jNode: number,
): boolean {
  if (!Number.isInteger(iNode) || !Number.isInteger(jNode)) return false;
  if (iNode === jNode) return false;
  const pts = geometry.points.rawVal;
  if (!pts.has(iNode) || !pts.has(jNode)) return false;
  const lines = geometry.lines.rawVal;
  const id = getNextMapId(lines);
  const m = new Map(lines);
  m.set(id, [iNode, jNode]);
  geometry.lines.val = m;
  return true;
}

/** Same rules as geometry editor: drop lines through point, then drop unused points */
export function removePointFromGeometry(geometry: Geometry, pointId: number): void {
  const pointsMap = new Map(geometry.points.rawVal);
  const linesMap = geometry.lines.rawVal;

  if (!pointsMap.has(pointId)) return;

  pointsMap.delete(pointId);

  const adjustedLines = new Map<number, [number, number]>();
  linesMap.forEach((line, id) => {
    if (line[0] !== pointId && line[1] !== pointId) {
      adjustedLines.set(id, line);
    }
  });

  if (adjustedLines.size === 0) {
    geometry.points.val = new Map();
    geometry.lines.val = new Map();
    return;
  }

  const usedPointIds = new Set<number>();
  adjustedLines.forEach((line) => {
    usedPointIds.add(line[0]);
    usedPointIds.add(line[1]);
  });
  const compactPoints = new Map<number, [number, number, number]>();
  pointsMap.forEach((point, id) => {
    if (usedPointIds.has(id)) {
      compactPoints.set(id, point);
    }
  });

  geometry.points.val = compactPoints;
  geometry.lines.val = adjustedLines;
}

export function removeLineFromGeometry(geometry: Geometry, lineId: number): void {
  const m = new Map(geometry.lines.rawVal);
  if (!m.has(lineId)) return;
  m.delete(lineId);
  geometry.lines.val = m;
}

export function updateNodeXYZ(
  geometry: Geometry,
  pointId: number,
  x: number,
  y: number,
  z: number,
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
  const pts = geometry.points.rawVal;
  const p = pts.get(pointId);
  if (!p) return;
  if (p[0] === x && p[1] === y && p[2] === z) return;
  const m = new Map(pts);
  m.set(pointId, [x, y, z]);
  geometry.points.val = m;
}

/** Returns false if validation failed (caller may force re-render to revert inputs). */
export function updateLineEndpoints(
  geometry: Geometry,
  lineId: number,
  iNode: number,
  jNode: number,
): boolean {
  if (!Number.isInteger(iNode) || !Number.isInteger(jNode)) return false;
  if (iNode === jNode) return false;
  const pts = geometry.points.rawVal;
  if (!pts.has(iNode) || !pts.has(jNode)) return false;
  const lines = geometry.lines.rawVal;
  if (!lines.has(lineId)) return false;
  const cur = lines.get(lineId)!;
  if (cur[0] === iNode && cur[1] === jNode) return true;
  const m = new Map(lines);
  m.set(lineId, [iNode, jNode]);
  geometry.lines.val = m;
  return true;
}
