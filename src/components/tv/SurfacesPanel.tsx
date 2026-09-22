import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Opening, OpeningType, Surface, SurfaceKind } from "@/lib/tilevision/types";

interface Props {
  surfaces: Surface[];
  onChange: (surfaces: Surface[]) => void;
  activeId: string;
  onActiveChange: (id: string) => void;
}

export function newSurface(index: number): Surface {
  return {
    id: crypto.randomUUID(),
    name: `الحائط ${index}`,
    kind: "wall",
    width: 0,
    height: 0,
    openings: [],
  };
}

const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v)));

export function SurfacesPanel({ surfaces, onChange, activeId, onActiveChange }: Props) {
  const update = (id: string, patch: Partial<Surface>) =>
    onChange(surfaces.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const updateOpening = (sid: string, oid: string, patch: Partial<Opening>) =>
    onChange(
      surfaces.map((s) =>
        s.id === sid
          ? { ...s, openings: s.openings.map((o) => (o.id === oid ? { ...o, ...patch } : o)) }
          : s,
      ),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {surfaces.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onActiveChange(s.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              s.id === activeId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-accent"
            }`}
          >
            {s.name || "سطح"}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const s = newSurface(surfaces.length + 1);
            onChange([...surfaces, s]);
            onActiveChange(s.id);
          }}
        >
          <Plus className="size-4" /> إضافة سطح
        </Button>
      </div>

      {surfaces.map((s) =>
        s.id !== activeId ? null : (
          <div key={s.id} className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>اسم السطح</Label>
                <Input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>نوع السطح</Label>
                <Select
                  value={s.kind}
                  onValueChange={(v) => update(s.id, { kind: v as SurfaceKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wall">جدار</SelectItem>
                    <SelectItem value="floor">أرضية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{s.kind === "floor" ? "العرض (سم)" : "عرض الجدار (سم)"}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={s.width || ""}
                  onChange={(e) => update(s.id, { width: num(e.target.value) })}
                  placeholder="320"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{s.kind === "floor" ? "الطول (سم)" : "ارتفاع الجدار (سم)"}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={s.height || ""}
                  onChange={(e) => update(s.id, { height: num(e.target.value) })}
                  placeholder="280"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">الفتحات (اختياري)</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    update(s.id, {
                      openings: [
                        ...s.openings,
                        {
                          id: crypto.randomUUID(),
                          type: "door" as OpeningType,
                          width: 90,
                          height: 210,
                          x: 0,
                          y: Math.max(0, s.height - 210),
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" /> إضافة فتحة
                </Button>
              </div>

              {s.openings.map((o) => (
                <div key={o.id} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-6">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs">النوع</Label>
                    <Select
                      value={o.type}
                      onValueChange={(v) => updateOpening(s.id, o.id, { type: v as OpeningType })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="door">باب</SelectItem>
                        <SelectItem value="window">نافذة</SelectItem>
                        <SelectItem value="opening">فتحة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(
                    [
                      ["width", "العرض"],
                      ["height", "الارتفاع"],
                      ["x", "الموقع الأفقي"],
                      ["y", "الموقع العمودي"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        className="h-9"
                        type="number"
                        inputMode="decimal"
                        value={o[key] || ""}
                        onChange={(e) => updateOpening(s.id, o.id, { [key]: num(e.target.value) })}
                      />
                    </div>
                  ))}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() =>
                        update(s.id, { openings: s.openings.filter((x) => x.id !== o.id) })
                      }
                      aria-label="حذف الفتحة"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {surfaces.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  const rest = surfaces.filter((x) => x.id !== s.id);
                  onChange(rest);
                  onActiveChange(rest[0]!.id);
                }}
              >
                <Trash2 className="size-4" /> حذف هذا السطح
              </Button>
            )}
          </div>
        ),
      )}
    </div>
  );
}
