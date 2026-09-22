import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamImage } from "@/lib/stream-image";
import { dataUrlToFile, type ImageAsset } from "@/lib/tilevision/images";
import { buildVisualizationPrompt } from "@/lib/tilevision/prompt";
import type { LayoutOptions, LayoutResult, Surface, TileSpec } from "@/lib/tilevision/types";

interface Props {
  roomImage: ImageAsset | null;
  tileImage: ImageAsset | null;
  surface: Surface;
  tile: TileSpec;
  options: LayoutOptions;
  result: LayoutResult;
  notes: string;
  image: string | null;
  onImage: (src: string | null) => void;
}

export function Visualization({
  roomImage,
  tileImage,
  surface,
  tile,
  options,
  result,
  notes,
  image,
  onImage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isFinal, setIsFinal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState("");

  const missing = !roomImage || !tileImage;

  async function run(regenerate: boolean) {
    if (!roomImage || !tileImage) return;
    setLoading(true);
    setError(null);
    setIsFinal(false);
    try {
      const form = new FormData();
      form.append(
        "prompt",
        buildVisualizationPrompt({
          surface,
          tile,
          options,
          result,
          notes,
          adjustment: regenerate ? adjustment : undefined,
          hasPrevious: regenerate && !!image,
        }),
      );
      if (regenerate && image) form.append("image[]", dataUrlToFile(image, "previous.png"));
      form.append("image[]", dataUrlToFile(roomImage.dataUrl, "room.jpg"));
      form.append("image[]", dataUrlToFile(tileImage.dataUrl, "tile.jpg"));

      await streamImage("/api/edit-image", form, (src, final) => {
        onImage(src);
        setIsFinal(final);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("503") || msg.includes("غير متاحة")
          ? "خدمة المعاينة غير متاحة حاليًا."
          : "تعذر إنشاء المعاينة. المخطط الهندسي وقائمة القص تعمل بشكل طبيعي.",
      );
      setIsFinal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {missing ? (
        <p className="rounded-md border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          لعرض المعاينة الواقعية، أضف صورة المكان وصورة البلاطة. المخطط الهندسي يعمل بدونهما.
        </p>
      ) : (
        <Button type="button" onClick={() => void run(false)} disabled={loading} size="lg">
          <Sparkles className="size-4" />
          {loading ? "جارٍ إنشاء المعاينة…" : image ? "إنشاء معاينة جديدة" : "شوف النتيجة"}
        </Button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">تم إنشاء المخطط بنجاح.</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {image && (
        <div className="space-y-4">
          <img
            src={image}
            alt="معاينة المكان بعد التركيب"
            className={`w-full rounded-lg border border-border transition-[filter] duration-500 ${isFinal ? "blur-0" : "blur-2xl"}`}
          />
          <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium">هل تريد تعديل المعاينة؟</p>
            <Textarea
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="مثال: اجعل اتجاه البلاط رأسيًا"
              rows={2}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void run(true)}
              disabled={loading || !adjustment.trim()}
            >
              <RefreshCw className="size-4" /> إعادة التوليد
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
