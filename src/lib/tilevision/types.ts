export type Orientation = "horizontal" | "vertical";
export type StartPoint = "left" | "right" | "center" | "opening";
export type SurfaceKind = "wall" | "floor";
export type OpeningType = "door" | "window" | "opening";

export interface Opening {
  id: string;
  type: OpeningType;
  width: number; // cm
  height: number; // cm
  x: number; // cm from left
  y: number; // cm from top
}

export interface Surface {
  id: string;
  name: string;
  kind: SurfaceKind;
  width: number; // cm
  height: number; // cm (for floor: depth)
  openings: Opening[];
}

export interface TileSpec {
  length: number; // cm
  width: number; // cm
  grout: number; // mm
}

export interface LayoutOptions {
  orientation: Orientation;
  startPoint: StartPoint;
  avoidSlivers: boolean;
}

export interface Placement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "full" | "cut";
  row: number;
  column: number;
  tileIndex: number;
  cutLabel?: string;
  aroundOpening: boolean;
}

export interface CutGroup {
  width: number;
  height: number;
  count: number;
  perTile: number;
  tilesNeeded: number;
}

export interface LayoutStats {
  surfaceArea: number; // m2 (net, openings removed)
  grossArea: number; // m2
  openingsArea: number; // m2
  fullTiles: number;
  cutTiles: number;
  rows: number;
  columns: number;
  tilesToBuy: number;
  tilesWithReuse: number;
  wastePercent: number;
  balanced: boolean;
  tileWidth: number;
  tileHeight: number;
  groutCm: number;
}

export interface LayoutResult {
  placements: Placement[];
  cutList: CutGroup[];
  stats: LayoutStats;
  xPieces: { start: number; size: number; isCut: boolean }[];
  yPieces: { start: number; size: number; isCut: boolean }[];
}
