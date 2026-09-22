import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, Info, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/tv/ImageUploader";
import { SurfacesPanel, newSurface } from "@/components/tv/SurfacesPanel";
import { LayoutSvg } from "@/components/tv/LayoutSvg";
import { CutListTable } from "@/components/tv/CutListTable";
import { Visualization } from "@/components/tv/Visualization";
import { ReportDocument } from "@/components/tv/ReportDocument";
import { computeLayout, round1, validateInputs } from "@/lib/tilevision/engine";
import type { ImageAsset } from "@/lib/tilevision/images";
import type {
  LayoutOptions,
  Orientation,
  Placement,
  StartPoint,
  Surface,
  TileSpec,
} from "@/lib/tilevision/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TileVision — شوف النتيجة قبل ما تركب" },
      {
        name: "description",
        content:
          "أداة هندسية لتوزيع الفايونص: أدخل قياسات الجدار والبلاطة والفاصل، واحصل على مخطط الحبات والقصاصات وقائمة القص ومعاينة واقعية قبل التركيب.",
      },
      { property: "og:title", content: "TileVision — شوف النتيجة قبل ما تركب" },
      {
        property: "og:description",
        content: "مخطط توزيع الفايونص، قائمة القص، والمعاينة الواقعية قبل بدء التركيب.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "tilevision:v1";

interface ProjectState {
  projectName: string;
  roomImages: ImageAsset[];
  mainImageId: string | null;
  tileImage: ImageAsset | null;
  tile: TileSpec;
  surfaces: Surface[];
  activeSurfaceId: string;
  options: LayoutOptions;
  notes: string;
}

function initialState(): ProjectState {
  const s = newSurface(1);
  return {
    projectName: "",
    roomImages: [],
    mainImageId: null,
    tileImage: null,
    tile: { length: 0, width: 0, grout: 3 },
    surfaces: [s],
    activeSurfaceId: s.id,
    options: { orientation: "horizontal", startPoint: "left", avoidSlivers: true },
    notes: "",
  };
}

const STEPS = [
  { n: "01", t: "بيانات المكان" },
  { n: "02", t: "مخطط التركيب" },
  { n: "03", t: "المعاينة" },
  { n: "04", t: "التقرير" },
];

function Index() {
  const [state, setState] = useState<ProjectState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Placement | null>(null);
  const [visual, setVisual] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectState;
        if (parsed?.surfaces?.length) setState(parsed);
      }
    } catch {
      /* ignore corrupted session */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full — session stays in memory */
    }
  }, [state, hydrated]);

  const patch = (p: Partial<ProjectState>) => setState((s) => ({ ...s, ...p }));

  const activeSurface =
    state.surfaces.find((s) => s.id === state.activeSurfaceId) ?? state.surfaces[0]!;

  const results = useMemo(() => {
    if (!calculated) return [];
    return state.surfaces
      .filter((s) => s.width > 0 && s.height > 0)
      .map((s) => ({ surface: s, result: computeLayout(s, state.tile, state.options) }));
  }, [calculated, state.surfaces, state.tile, state.options]);

  const active = results.find((r) => r.surface.id === activeSurface.id) ?? results[0];
  const mainImage =
    state.roomImages.find((i) => i.id === state.mainImageId) ?? state.roomImages[0] ?? null;

  function calculate() {
    const issues = state.surfaces.flatMap((s) =>
      validateInputs(s, state.tile).map((i) => `${s.name}: ${i.message}`),
    );
    const unique = [...new Set(issues)];
    setErrors(unique);
    if (unique.length > 0) {
      setCalculated(false);
      return;
    }
    setCalculated(true);
    setSelected(null);
    requestAnimationFrame(() =>
      document.getElementById("layout")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">TileVision</p>
            <p className="tv-eyebrow">FIELD LAYOUT INSTRUMENT</p>
          </div>
          <Ruler className="size-5 text-accent" />
        </div>
      </header>

      <main className="no-print mx-auto max-w-6xl space-y-10 px-4 py-8">
        {/* Hero */}
        <section className="tv-grid-bg tv-card overflow-hidden p-6 sm:p-10">
          <h1 className="max-w-2xl text-3xl leading-tight font-extrabold sm:text-4xl">
            شوف النتيجة قبل ما تركب
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            ارفع صورة المكان، أدخل القياسات ومقاس الفايونص، وشاهد كيف سيتم توزيع الحبات والقصاصات
            قبل التنفيذ.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-md border border-border bg-card/70 p-3">
                <p className="font-mono text-accent">{s.n}</p>
                <p className="mt-1 text-sm font-medium">{s.t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stage 01 */}
        <section className="space-y-6">
          <SectionTitle n="01" title="بيانات المكان" />

          <div className="tv-card space-y-4 p-5">
            <div className="space-y-1.5">
              <Label>اسم المشروع</Label>
              <Input
                value={state.projectName}
                onChange={(e) => patch({ projectName: e.target.value })}
                placeholder="مثال: حمام الطابق الأول"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="tv-card space-y-3 p-5">
              <h3 className="font-bold">صور المكان</h3>
              <ImageUploader
                images={state.roomImages}
                onChange={(imgs) =>
                  patch({
                    roomImages: imgs,
                    mainImageId: imgs.some((i) => i.id === state.mainImageId)
                      ? state.mainImageId
                      : (imgs[0]?.id ?? null),
                  })
                }
                multiple
                mainId={mainImage?.id ?? null}
                onSetMain={(id) => patch({ mainImageId: id })}
                buttonLabel="رفع صورة المكان"
                hint="JPG أو PNG أو WEBP — يمكن رفع عدة صور"
              />
            </div>

            <div className="tv-card space-y-3 p-5">
              <h3 className="font-bold">مرجع البلاطة</h3>
              <p className="text-sm text-muted-foreground">
                ارفع صورة حقيقية للبلاطة التي سيتم تركيبها.
              </p>
              <ImageUploader
                images={state.tileImage ? [state.tileImage] : []}
                onChange={(imgs) => patch({ tileImage: imgs[0] ?? null })}
                buttonLabel={state.tileImage ? "استبدال الصورة" : "رفع صورة البلاطة"}
                hint="صورة واحدة للبلاطة"
              />
            </div>
          </div>

          <div className="tv-card space-y-4 p-5">
            <h3 className="font-bold">مقاسات البلاطة</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>طول البلاطة (سم)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={state.tile.length || ""}
                  placeholder="160"
                  onChange={(e) =>
                    patch({ tile: { ...state.tile, length: Number(e.target.value) || 0 } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>عرض البلاطة (سم)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={state.tile.width || ""}
                  placeholder="80"
                  onChange={(e) =>
                    patch({ tile: { ...state.tile, width: Number(e.target.value) || 0 } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>الفاصل (مم)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={state.tile.grout}
                  placeholder="3"
                  onChange={(e) =>
                    patch({ tile: { ...state.tile, grout: Number(e.target.value) || 0 } })
                  }
                />
              </div>
            </div>
            {state.tile.length > 0 && state.tile.width > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3">
                <div
                  className="rounded-xs border"
                  style={{
                    width: 72,
                    height: (72 * state.tile.width) / state.tile.length,
                    background: "var(--tile-full)",
                    borderColor: "var(--tile-full-stroke)",
                  }}
                />
                <p className="font-mono text-sm">
                  {state.tile.length} × {state.tile.width} سم · فاصل {state.tile.grout} مم (
                  {state.tile.grout / 10} سم)
                </p>
              </div>
            )}
          </div>

          <div className="tv-card space-y-4 p-5">
            <h3 className="font-bold">الأسطح</h3>
            <SurfacesPanel
              surfaces={state.surfaces}
              onChange={(surfaces) => patch({ surfaces })}
              activeId={activeSurface.id}
              onActiveChange={(id) => patch({ activeSurfaceId: id })}
            />
          </div>

          <div className="tv-card grid gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>اتجاه البلاطة</Label>
              <Select
                value={state.options.orientation}
                onValueChange={(v) =>
                  patch({ options: { ...state.options, orientation: v as Orientation } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">أفقي</SelectItem>
                  <SelectItem value="vertical">رأسي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>نقطة البداية</Label>
              <Select
                value={state.options.startPoint}
                onValueChange={(v) =>
                  patch({ options: { ...state.options, startPoint: v as StartPoint } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">من اليسار</SelectItem>
                  <SelectItem value="right">من اليمين</SelectItem>
                  <SelectItem value="center">من المنتصف</SelectItem>
                  <SelectItem value="opening">من الفتحة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تفادي القصاصات الصغيرة</Label>
              <Select
                value={state.options.avoidSlivers ? "yes" : "no"}
                onValueChange={(v) =>
                  patch({ options: { ...state.options, avoidSlivers: v === "yes" } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">نعم — توزيع متوازن</SelectItem>
                  <SelectItem value="no">لا — التزم بنقطة البداية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="tv-card space-y-2 p-5">
            <Label>ملاحظات على التنفيذ</Label>
            <Textarea
              rows={3}
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="مثال: ابدأ من منتصف الجدار · القص يكون من الجهة السفلية"
            />
          </div>

          {/* Setup summary */}
          <div className="tv-card space-y-4 p-5">
            <h3 className="font-bold">قبل الحساب</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                {mainImage ? (
                  <img src={mainImage.dataUrl} alt="" className="h-20 w-28 rounded-md border object-cover" />
                ) : (
                  <div className="flex h-20 w-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    لا توجد صورة
                  </div>
                )}
                {state.tileImage ? (
                  <img src={state.tileImage.dataUrl} alt="" className="h-20 w-20 rounded-md border object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground">
                    بلا صورة بلاطة
                  </div>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <Row k="السطح الحالي" v={`${activeSurface.width || "—"} × ${activeSurface.height || "—"} سم`} />
                <Row k="البلاطة" v={`${state.tile.length || "—"} × ${state.tile.width || "—"} سم`} />
                <Row k="الفاصل" v={`${state.tile.grout} مم`} />
                <Row k="الاتجاه" v={state.options.orientation === "horizontal" ? "أفقي" : "رأسي"} />
                <Row
                  k="نقطة البداية"
                  v={
                    { left: "من اليسار", right: "من اليمين", center: "من المنتصف", opening: "من الفتحة" }[
                      state.options.startPoint
                    ]
                  }
                />
                <Row k="عدد الأسطح" v={String(state.surfaces.length)} />
              </dl>
            </div>

            {errors.length > 0 && (
              <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}

            <Button type="button" size="lg" onClick={calculate}>
              <Calculator className="size-4" /> احسب مخطط التركيب
            </Button>
          </div>
        </section>

        {/* Stage 02 */}
        {calculated && active && (
          <section id="layout" className="space-y-6">
            <SectionTitle n="02" title="مخطط توزيع الفايونص" />

            {results.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {results.map((r) => (
                  <button
                    key={r.surface.id}
                    type="button"
                    onClick={() => patch({ activeSurfaceId: r.surface.id })}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      r.surface.id === active.surface.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {r.surface.name}
                  </button>
                ))}
              </div>
            )}

            <div className="tv-card grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
              <Row k="أبعاد السطح" v={`${active.surface.width} × ${active.surface.height} سم`} block />
              <Row k="مقاس البلاطة" v={`${state.tile.length} × ${state.tile.width} سم`} block />
              <Row k="الفاصل" v={`${state.tile.grout} مم`} block />
              <Row k="الاتجاه" v={state.options.orientation === "horizontal" ? "أفقي" : "رأسي"} block />
              <Row
                k="نقطة البداية"
                block
                v={
                  { left: "من اليسار", right: "من اليمين", center: "من المنتصف", opening: "من الفتحة" }[
                    state.options.startPoint
                  ]
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="البلاطات الكاملة" value={String(active.result.stats.fullTiles)} />
              <StatCard label="عدد القصاصات" value={String(active.result.stats.cutTiles)} />
              <StatCard label="المساحة" value={`${round1(active.result.stats.surfaceArea)} م²`} />
              <StatCard
                label="الهدر التقريبي"
                value={`${active.result.stats.wastePercent}%`}
                sub={`بلاطات مطلوبة: ${active.result.stats.tilesToBuy}`}
              />
            </div>

            {active.result.stats.balanced && (
              <p className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                <Info className="size-4" /> تم تعديل نقطة البداية قليلًا لتفادي قصاصة صغيرة جدًا
                وتوزيع الباقي على الجهتين.
              </p>
            )}

            <div className="tv-card p-5">
              <LayoutSvg
                surface={active.surface}
                result={active.result}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            </div>

            <div className="tv-card space-y-3 p-5">
              <h3 className="font-bold">قائمة القص</h3>
              <CutListTable cutList={active.result.cutList} />
            </div>
          </section>
        )}

        {/* Stage 03 */}
        {calculated && active && (
          <section className="space-y-6">
            <SectionTitle n="03" title="المعاينة الواقعية" />
            <div className="tv-card p-5">
              <Visualization
                roomImage={mainImage}
                tileImage={state.tileImage}
                surface={active.surface}
                tile={state.tile}
                options={state.options}
                result={active.result}
                notes={state.notes}
                image={visual}
                onImage={setVisual}
              />
            </div>
          </section>
        )}

        {/* Stage 04 */}
        {calculated && active && (
          <section className="space-y-6 pb-12">
            <SectionTitle n="04" title="التقرير" />
            <div className="tv-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-muted-foreground">
                تقرير كامل بالعربية: القياسات، المخطط، قائمة القص، الصور والملاحظات.
              </p>
              <Button type="button" size="lg" onClick={() => window.print()}>
                <Download className="size-4" /> تحميل التقرير
              </Button>
            </div>
          </section>
        )}
      </main>

      {calculated && (
        <ReportDocument
          projectName={state.projectName}
          roomImages={state.roomImages}
          tileImage={state.tileImage}
          tile={state.tile}
          options={state.options}
          notes={state.notes}
          visualization={visual}
          items={results}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selected?.kind === "full"
                ? `البلاطة رقم ${selected?.tileIndex}`
                : `قصاصة رقم ${selected?.cutLabel}`}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <Row k="الحالة" v={selected.kind === "full" ? "كاملة" : "قصاصة"} />
              <Row k="المقاس" v={`${round1(selected.width)} × ${round1(selected.height)} سم`} />
              <Row k="الموضع X" v={`${round1(selected.x)} سم`} />
              <Row k="الموضع Y" v={`${round1(selected.y)} سم`} />
              <Row k="الصف" v={String(selected.row)} />
              <Row k="العمود" v={String(selected.column)} />
              {selected.aroundOpening && <Row k="ملاحظة" v="قص حول فتحة" />}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border pb-2">
      <span className="font-mono text-sm text-accent">{n}</span>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

function Row({ k, v, block }: { k: string; v: string; block?: boolean }) {
  if (block)
    return (
      <div>
        <dt className="text-xs text-muted-foreground">{k}</dt>
        <dd className="font-mono text-sm font-medium">{v}</dd>
      </div>
    );
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tv-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
