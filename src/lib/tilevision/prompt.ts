import { round1 } from "./engine";
import type { LayoutOptions, LayoutResult, Surface, TileSpec } from "./types";

const ORIENT: Record<string, string> = { horizontal: "landscape (long side horizontal)", vertical: "portrait (long side vertical)" };
const START: Record<string, string> = {
  left: "from the left edge",
  right: "from the right edge",
  center: "centered on the surface axis",
  opening: "aligned with the opening edge",
};

export function buildVisualizationPrompt(args: {
  surface: Surface;
  tile: TileSpec;
  options: LayoutOptions;
  result: LayoutResult;
  notes?: string;
  adjustment?: string;
  hasPrevious?: boolean;
}): string {
  const { surface, tile, options, result, notes, adjustment, hasPrevious } = args;
  const s = result.stats;
  const rowsDesc = result.yPieces.map((p) => `${round1(p.size)}cm`).join(" / ");
  const colsDesc = result.xPieces.map((p) => `${round1(p.size)}cm`).join(" / ");
  const cuts = result.cutList.map((c) => `${c.count}× ${c.width}×${c.height}cm`).join("; ") || "none";
  const openings = (surface.openings ?? [])
    .map((o) => `${o.type} ${o.width}×${o.height}cm at x=${o.x}cm y=${o.y}cm`)
    .join("; ") || "none";

  const imageRoles = hasPrevious
    ? "Image 1 is the previous render to refine, image 2 is the real room photo, image 3 is the exact tile product photo."
    : "Image 1 is the real room photo to modify, image 2 is the exact tile product photo to apply.";

  return [
    "Photorealistic architectural visualization of a real tiling job.",
    imageRoles,
    `Apply the tile from the tile reference photo onto the ${surface.kind === "floor" ? "floor" : "wall"} named "${surface.name}" in the room photo.`,
    "STRICT RULES: keep the exact same room, same camera angle, same perspective, same lighting, same doors and windows, same existing furniture. Do not add or remove objects. Do not change room geometry. Do not invent a new tile pattern, texture or colour — reproduce the tile reference exactly.",
    `SURFACE: ${surface.width}cm wide × ${surface.height}cm high, net area ${round1(s.surfaceArea)} m².`,
    `TILE: ${tile.length}×${tile.width}cm, installed ${ORIENT[options.orientation]}, grout joint ${tile.grout}mm (${s.groutCm}cm) in a matching neutral grout colour.`,
    `LAYOUT (computed geometrically, must be respected): start ${START[options.startPoint]}; ${s.rows} rows × ${s.columns} columns; ${s.fullTiles} full tiles and ${s.cutTiles} cut pieces.`,
    `Column widths left to right: ${colsDesc}. Row heights top to bottom: ${rowsDesc}.`,
    `Cut pieces: ${cuts}. Openings to keep untiled: ${openings}.`,
    "Tile sizes in the render must visually match these proportions: cut pieces appear exactly where the layout says, joints are straight and continuous.",
    notes ? `Site notes from the installer: ${notes}` : "",
    adjustment ? `Requested adjustment for this new render: ${adjustment}` : "",
    "Output a clean, realistic photograph of the finished result.",
  ]
    .filter(Boolean)
    .join("\n");
}
