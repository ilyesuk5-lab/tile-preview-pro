import type {
  CutGroup,
  LayoutOptions,
  LayoutResult,
  Opening,
  Placement,
  Surface,
  TileSpec,
} from "./types";

const EPS = 0.05; // cm tolerance

export interface AxisPiece {
  start: number;
  size: number;
  isCut: boolean;
}

/** Build one axis of the grid from a virtual origin `s0` (may be negative). */
export function buildAxis(total: number, unit: number, grout: number, s0: number): AxisPiece[] {
  const module = unit + grout;
  let start = s0;
  while (start > EPS) start -= module;
  const pieces: AxisPiece[] = [];
  let guard = 0;
  while (start < total - EPS && guard < 5000) {
    guard += 1;
    const a = Math.max(0, start);
    const b = Math.min(total, start + unit);
    const size = b - a;
    if (size > EPS) pieces.push({ start: a, size, isCut: size < unit - EPS });
    start += module;
  }
  return pieces;
}

function edgeMin(pieces: AxisPiece[]): number {
  if (pieces.length === 0) return Infinity;
  const first = pieces[0]!;
  const last = pieces[pieces.length - 1]!;
  const values = [first, last].filter((p) => p.isCut).map((p) => p.size);
  return values.length ? Math.min(...values) : Infinity;
}

/** Deterministic origin selection with a professional anti-sliver balance rule. */
export function resolveAxis(
  total: number,
  unit: number,
  grout: number,
  start: "left" | "right" | "center" | "opening",
  openingStart: number | undefined,
  avoidSlivers: boolean,
): { pieces: AxisPiece[]; balanced: boolean } {
  const module = unit + grout;
  let base: number;
  if (start === "left") {
    base = 0;
  } else if (start === "right") {
    const n = Math.max(1, Math.floor((total + grout) / module));
    base = total - (n * unit + (n - 1) * grout);
  } else if (start === "center") {
    const n = Math.max(1, Math.floor((total + grout) / module));
    base = (total - (n * unit + (n - 1) * grout)) / 2;
  } else {
    base = openingStart ?? 0;
  }

  const basePieces = buildAxis(total, unit, grout, base);
  if (!avoidSlivers) return { pieces: basePieces, balanced: false };

  const minCut = Math.min(unit * 0.25, 10);
  const baseScore = edgeMin(basePieces);
  if (baseScore >= minCut) return { pieces: basePieces, balanced: false };

  const alt = buildAxis(total, unit, grout, base - module / 2);
  const altScore = edgeMin(alt);
  if (altScore > baseScore + EPS) return { pieces: alt, balanced: true };
  return { pieces: basePieces, balanced: false };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function subtractRect(rect: Rect, hole: Rect): Rect[] {
  const ix0 = Math.max(rect.x, hole.x);
  const iy0 = Math.max(rect.y, hole.y);
  const ix1 = Math.min(rect.x + rect.width, hole.x + hole.width);
  const iy1 = Math.min(rect.y + rect.height, hole.y + hole.height);
  if (ix1 - ix0 <= EPS || iy1 - iy0 <= EPS) return [rect];
  const out: Rect[] = [];
  if (iy0 - rect.y > EPS) out.push({ x: rect.x, y: rect.y, width: rect.width, height: iy0 - rect.y });
  if (rect.y + rect.height - iy1 > EPS)
    out.push({ x: rect.x, y: iy1, width: rect.width, height: rect.y + rect.height - iy1 });
  if (ix0 - rect.x > EPS) out.push({ x: rect.x, y: iy0, width: ix0 - rect.x, height: iy1 - iy0 });
  if (rect.x + rect.width - ix1 > EPS)
    out.push({ x: ix1, y: iy0, width: rect.x + rect.width - ix1, height: iy1 - iy0 });
  return out.filter((r) => r.width > 1 && r.height > 1);
}

function subtractOpenings(rect: Rect, openings: Opening[]): Rect[] {
  let rects: Rect[] = [rect];
  for (const o of openings) {
    const hole: Rect = { x: o.x, y: o.y, width: o.width, height: o.height };
    const next: Rect[] = [];
    for (const r of rects) next.push(...subtractRect(r, hole));
    rects = next;
  }
  return rects;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeLayout(
  surface: Surface,
  tile: TileSpec,
  options: LayoutOptions,
): LayoutResult {
  const grout = tile.grout / 10; // mm -> cm
  const tileWidth = options.orientation === "horizontal" ? tile.length : tile.width;
  const tileHeight = options.orientation === "horizontal" ? tile.width : tile.length;

  const openings = surface.openings ?? [];
  const firstOpening = openings.length
    ? [...openings].sort((a, b) => a.x - b.x)[0]
    : undefined;

  const xAxis = resolveAxis(
    surface.width,
    tileWidth,
    grout,
    options.startPoint,
    firstOpening?.x,
    options.avoidSlivers,
  );
  const yAxis = resolveAxis(
    surface.height,
    tileHeight,
    grout,
    options.startPoint === "center" ? "center" : "left",
    undefined,
    options.avoidSlivers,
  );

  const placements: Placement[] = [];
  let tileIndex = 0;
  let cutIndex = 0;

  yAxis.pieces.forEach((yp, rowIdx) => {
    xAxis.pieces.forEach((xp, colIdx) => {
      const base: Rect = { x: xp.start, y: yp.start, width: xp.size, height: yp.size };
      const parts = subtractOpenings(base, openings);
      for (const part of parts) {
        const untouched =
          Math.abs(part.width - base.width) < EPS && Math.abs(part.height - base.height) < EPS;
        const isFull = !xp.isCut && !yp.isCut && untouched;
        tileIndex += 1;
        const placement: Placement = {
          id: `${rowIdx}-${colIdx}-${round1(part.x)}-${round1(part.y)}`,
          x: part.x,
          y: part.y,
          width: part.width,
          height: part.height,
          kind: isFull ? "full" : "cut",
          row: rowIdx + 1,
          column: colIdx + 1,
          tileIndex,
          aroundOpening: !untouched,
        };
        if (!isFull) {
          cutIndex += 1;
          placement.cutLabel = String(cutIndex).padStart(2, "0");
        }
        placements.push(placement);
      }
    });
  });

  const fullTiles = placements.filter((p) => p.kind === "full").length;
  const cuts = placements.filter((p) => p.kind === "cut");

  // Cut list, grouped by identical dimensions, with re-use of off-cuts.
  const map = new Map<string, CutGroup>();
  for (const c of cuts) {
    const w = round1(c.width);
    const h = round1(c.height);
    const key = `${w}x${h}`;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { width: w, height: h, count: 1, perTile: 1, tilesNeeded: 1 });
  }
  const cutList = [...map.values()].map((g) => {
    const fitA = Math.floor((tileWidth + grout) / (g.width + grout)) * Math.floor((tileHeight + grout) / (g.height + grout));
    const fitB = Math.floor((tileWidth + grout) / (g.height + grout)) * Math.floor((tileHeight + grout) / (g.width + grout));
    const perTile = Math.max(1, fitA, fitB);
    return { ...g, perTile, tilesNeeded: Math.ceil(g.count / perTile) };
  });
  cutList.sort((a, b) => b.width * b.height - a.width * a.height);

  const tilesWithReuse = fullTiles + cutList.reduce((s, g) => s + g.tilesNeeded, 0);
  const tilesNoReuse = fullTiles + cuts.length;
  const tiledArea = placements.reduce((s, p) => s + p.width * p.height, 0);
  const consumedArea = tilesWithReuse * tileWidth * tileHeight;
  const wastePercent = consumedArea > 0 ? ((consumedArea - tiledArea) / consumedArea) * 100 : 0;
  const openingsArea = openings.reduce((s, o) => s + o.width * o.height, 0);

  return {
    placements,
    cutList,
    xPieces: xAxis.pieces,
    yPieces: yAxis.pieces,
    stats: {
      grossArea: (surface.width * surface.height) / 10000,
      openingsArea: openingsArea / 10000,
      surfaceArea: (surface.width * surface.height - openingsArea) / 10000,
      fullTiles,
      cutTiles: cuts.length,
      rows: yAxis.pieces.length,
      columns: xAxis.pieces.length,
      tilesToBuy: Math.ceil(tilesWithReuse * 1.05),
      tilesWithReuse: tilesNoReuse >= tilesWithReuse ? tilesWithReuse : tilesNoReuse,
      wastePercent: Math.max(0, round1(wastePercent)),
      balanced: xAxis.balanced || yAxis.balanced,
      tileWidth,
      tileHeight,
      groutCm: grout,
    },
  };
}

export interface ValidationIssue {
  message: string;
}

export function validateInputs(surface: Surface, tile: TileSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!surface.width || surface.width <= 0) issues.push({ message: "يرجى إدخال عرض السطح." });
  if (!surface.height || surface.height <= 0)
    issues.push({
      message: surface.kind === "floor" ? "يرجى إدخال طول الأرضية." : "يرجى إدخال ارتفاع الجدار.",
    });
  if (!tile.length || tile.length <= 0) issues.push({ message: "يرجى إدخال طول البلاطة." });
  if (!tile.width || tile.width <= 0) issues.push({ message: "يرجى إدخال عرض البلاطة." });
  if (tile.grout < 0 || tile.grout > 30) issues.push({ message: "قيمة الفاصل غير منطقية (0 - 30 مم)." });
  if (surface.width > 3000 || surface.height > 3000)
    issues.push({ message: "القياسات كبيرة جدًا، تأكد أنك تستعمل السنتيمتر." });
  for (const o of surface.openings ?? []) {
    if (o.width <= 0 || o.height <= 0) issues.push({ message: "قياسات الفتحة غير صالحة." });
    if (o.x < 0 || o.y < 0 || o.x + o.width > surface.width + 0.01 || o.y + o.height > surface.height + 0.01)
      issues.push({ message: "الفتحة خارج حدود السطح." });
  }
  return issues;
}
