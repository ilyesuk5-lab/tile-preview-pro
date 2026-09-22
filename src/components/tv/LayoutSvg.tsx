import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { round1 } from "@/lib/tilevision/engine";
import type { LayoutResult, Placement, Surface } from "@/lib/tilevision/types";

interface Props {
  surface: Surface;
  result: LayoutResult;
  interactive?: boolean;
  onSelect?: (p: Placement) => void;
  selectedId?: string | null;
}

export function LayoutSvg({ surface, result, interactive = true, onSelect, selectedId }: Props) {
  const pad = Math.max(surface.width, surface.height) * 0.12 + 20;
  const vbW = surface.width + pad * 2;
  const vbH = surface.height + pad * 2;
  const unit = Math.max(surface.width, surface.height) / 100; // scale helper for strokes/fonts

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [surface.id, result]);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const dim = (v: number) => `${round1(v)}`;
  const fs = unit * 3.2;

  return (
    <div className="space-y-3">
      {interactive && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(6, z * 1.25))}>
            <Plus className="size-4" /> تكبير
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.4, z / 1.25))}>
            <Minus className="size-4" /> تصغير
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            <Maximize2 className="size-4" /> ملء الشاشة
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="size-4" /> إعادة ضبط
          </Button>
          <span className="tv-eyebrow ms-auto hidden sm:inline">اسحب للتحريك · اضغط على أي بلاطة</span>
        </div>
      )}

      <div
        className="tv-grid-bg relative overflow-hidden rounded-lg border border-border bg-card"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if (!interactive) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({
            x: drag.current.ox + (e.clientX - drag.current.x),
            y: drag.current.oy + (e.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full"
          style={{
            aspectRatio: `${vbW} / ${vbH}`,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: drag.current ? "none" : "transform 120ms ease-out",
          }}
          direction="ltr"
        >
          <g transform={`translate(${pad}, ${pad})`}>
            {/* grout base */}
            <rect
              x={0}
              y={0}
              width={surface.width}
              height={surface.height}
              fill="var(--grout)"
              opacity={0.85}
            />

            {result.placements.map((p) => {
              const selected = selectedId === p.id;
              return (
                <g key={p.id}>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    fill={p.kind === "full" ? "var(--tile-full)" : "var(--tile-cut)"}
                    stroke={selected ? "var(--brass)" : p.kind === "full" ? "var(--tile-full-stroke)" : "var(--tile-cut-stroke)"}
                    strokeWidth={selected ? unit * 0.9 : unit * 0.28}
                    style={{ cursor: interactive ? "pointer" : "default" }}
                    onClick={() => onSelect?.(p)}
                  />
                  {p.width > unit * 16 && p.height > unit * 7 && (
                    <text
                      x={p.x + p.width / 2}
                      y={p.y + p.height / 2 + fs * 0.35}
                      textAnchor="middle"
                      fontSize={fs}
                      fill="var(--foreground)"
                      fontFamily="IBM Plex Mono, monospace"
                      pointerEvents="none"
                    >
                      {dim(p.width)} × {dim(p.height)}
                    </text>
                  )}
                  {p.kind === "cut" && p.width > unit * 8 && p.height > unit * 12 && (
                    <text
                      x={p.x + p.width / 2}
                      y={p.y + p.height / 2 - fs * 1.1}
                      textAnchor="middle"
                      fontSize={fs * 0.85}
                      fill="var(--tile-cut-stroke)"
                      fontFamily="IBM Plex Mono, monospace"
                      pointerEvents="none"
                    >
                      C{p.cutLabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* openings */}
            {(surface.openings ?? []).map((o) => (
              <g key={o.id}>
                <rect
                  x={o.x}
                  y={o.y}
                  width={o.width}
                  height={o.height}
                  fill="var(--opening)"
                  stroke="var(--blueprint)"
                  strokeWidth={unit * 0.4}
                  strokeDasharray={`${unit * 2} ${unit * 1.2}`}
                />
                <text
                  x={o.x + o.width / 2}
                  y={o.y + o.height / 2}
                  textAnchor="middle"
                  fontSize={fs}
                  fill="var(--blueprint)"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {o.type === "door" ? "DOOR" : o.type === "window" ? "WINDOW" : "OPENING"} {dim(o.width)}×{dim(o.height)}
                </text>
              </g>
            ))}

            {/* outline */}
            <rect
              x={0}
              y={0}
              width={surface.width}
              height={surface.height}
              fill="none"
              stroke="var(--blueprint)"
              strokeWidth={unit * 0.6}
            />

            {/* width dimension (top) */}
            <g stroke="var(--blueprint)" strokeWidth={unit * 0.25} fill="none">
              <line x1={0} y1={-pad * 0.45} x2={surface.width} y2={-pad * 0.45} />
              <line x1={0} y1={-pad * 0.6} x2={0} y2={-pad * 0.3} />
              <line x1={surface.width} y1={-pad * 0.6} x2={surface.width} y2={-pad * 0.3} />
            </g>
            <text
              x={surface.width / 2}
              y={-pad * 0.6}
              textAnchor="middle"
              fontSize={fs * 1.2}
              fill="var(--blueprint)"
              fontFamily="IBM Plex Mono, monospace"
            >
              {dim(surface.width)} cm
            </text>

            {/* height dimension (left) */}
            <g stroke="var(--blueprint)" strokeWidth={unit * 0.25} fill="none">
              <line x1={-pad * 0.45} y1={0} x2={-pad * 0.45} y2={surface.height} />
              <line x1={-pad * 0.6} y1={0} x2={-pad * 0.3} y2={0} />
              <line x1={-pad * 0.6} y1={surface.height} x2={-pad * 0.3} y2={surface.height} />
            </g>
            <text
              x={-pad * 0.62}
              y={surface.height / 2}
              textAnchor="middle"
              fontSize={fs * 1.2}
              fill="var(--blueprint)"
              fontFamily="IBM Plex Mono, monospace"
              transform={`rotate(-90 ${-pad * 0.62} ${surface.height / 2})`}
            >
              {dim(surface.height)} cm
            </text>

            {/* row / column indices */}
            {result.yPieces.map((p, i) => (
              <text
                key={`r${i}`}
                x={surface.width + pad * 0.25}
                y={p.start + p.size / 2 + fs * 0.35}
                textAnchor="middle"
                fontSize={fs}
                fill="var(--muted-foreground)"
                fontFamily="IBM Plex Mono, monospace"
              >
                R{i + 1}
              </text>
            ))}
            {result.xPieces.map((p, i) => (
              <text
                key={`c${i}`}
                x={p.start + p.size / 2}
                y={surface.height + pad * 0.4}
                textAnchor="middle"
                fontSize={fs}
                fill="var(--muted-foreground)"
                fontFamily="IBM Plex Mono, monospace"
              >
                C{i + 1}
              </text>
            ))}
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-xs border" style={{ background: "var(--tile-full)", borderColor: "var(--tile-full-stroke)" }} />
          بلاطة كاملة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-xs border" style={{ background: "var(--tile-cut)", borderColor: "var(--tile-cut-stroke)" }} />
          قصاصة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-xs border border-dashed" style={{ background: "var(--opening)", borderColor: "var(--blueprint)" }} />
          فتحة
        </span>
      </div>
    </div>
  );
}
