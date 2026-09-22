import { LayoutSvg } from "./LayoutSvg";
import { CutListTable } from "./CutListTable";
import { round1 } from "@/lib/tilevision/engine";
import type { ImageAsset } from "@/lib/tilevision/images";
import type { LayoutOptions, LayoutResult, Surface, TileSpec } from "@/lib/tilevision/types";

const ORIENT = { horizontal: "أفقي", vertical: "رأسي" } as const;
const START = { left: "من اليسار", right: "من اليمين", center: "من المنتصف", opening: "من الفتحة" } as const;

interface Props {
  projectName: string;
  roomImages: ImageAsset[];
  tileImage: ImageAsset | null;
  tile: TileSpec;
  options: LayoutOptions;
  notes: string;
  visualization: string | null;
  items: { surface: Surface; result: LayoutResult }[];
}

export function ReportDocument(props: Props) {
  const { projectName, roomImages, tileImage, tile, options, notes, visualization, items } = props;
  const date = new Date().toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="print-only" dir="rtl">
      <div className="space-y-6 p-6 text-foreground">
        <header className="flex items-baseline justify-between border-b pb-3">
          <div>
            <h1 className="text-2xl font-bold">TileVision</h1>
            <p className="tv-eyebrow">FIELD LAYOUT INSTRUMENT</p>
          </div>
          <div className="text-left text-sm">
            <p className="font-medium">{projectName || "مشروع بدون اسم"}</p>
            <p className="text-muted-foreground">{date}</p>
          </div>
        </header>

        <section className="print-break">
          <h2 className="mb-2 text-lg font-bold">معطيات المشروع</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-muted-foreground">مقاس البلاطة</td>
                <td className="py-1 font-mono">{tile.length} × {tile.width} سم</td>
                <td className="py-1 text-muted-foreground">الفاصل</td>
                <td className="py-1 font-mono">{tile.grout} مم ({tile.grout / 10} سم)</td>
              </tr>
              <tr>
                <td className="py-1 text-muted-foreground">الاتجاه</td>
                <td className="py-1">{ORIENT[options.orientation]}</td>
                <td className="py-1 text-muted-foreground">نقطة البداية</td>
                <td className="py-1">{START[options.startPoint]}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {(roomImages.length > 0 || tileImage) && (
          <section className="print-break">
            <h2 className="mb-2 text-lg font-bold">الصور</h2>
            <div className="grid grid-cols-4 gap-2">
              {roomImages.map((i) => (
                <img key={i.id} src={i.dataUrl} alt="" className="w-full rounded border object-cover" />
              ))}
              {tileImage && (
                <img src={tileImage.dataUrl} alt="" className="w-full rounded border object-cover" />
              )}
            </div>
          </section>
        )}

        {items.map(({ surface, result }) => (
          <section key={surface.id} className="print-break space-y-3 border-t pt-4">
            <h2 className="text-lg font-bold">
              {surface.name} — {surface.width} × {surface.height} سم
            </h2>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <Stat label="بلاطات كاملة" value={String(result.stats.fullTiles)} />
              <Stat label="قصاصات" value={String(result.stats.cutTiles)} />
              <Stat label="المساحة" value={`${round1(result.stats.surfaceArea)} م²`} />
              <Stat label="الهدر" value={`${result.stats.wastePercent}%`} />
            </div>
            <LayoutSvg surface={surface} result={result} interactive={false} />
            <h3 className="font-bold">قائمة القص</h3>
            <CutListTable cutList={result.cutList} />
          </section>
        ))}

        {visualization && (
          <section className="print-break border-t pt-4">
            <h2 className="mb-2 text-lg font-bold">المعاينة الواقعية</h2>
            <img src={visualization} alt="" className="w-full rounded border" />
          </section>
        )}

        {notes.trim() && (
          <section className="print-break border-t pt-4">
            <h2 className="mb-2 text-lg font-bold">ملاحظات على التنفيذ</h2>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-bold">{value}</p>
    </div>
  );
}
