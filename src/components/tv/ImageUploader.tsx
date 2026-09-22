import { useRef, useState } from "react";
import { ImagePlus, Star, Trash2, Eye } from "lucide-react";
import { fileToAsset, InvalidImageError, type ImageAsset } from "@/lib/tilevision/images";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  images: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
  multiple?: boolean;
  mainId?: string | null;
  onSetMain?: (id: string) => void;
  hint: string;
  buttonLabel: string;
}

export function ImageUploader({
  images,
  onChange,
  multiple = false,
  mainId,
  onSetMain,
  hint,
  buttonLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const assets: ImageAsset[] = [];
      for (const file of Array.from(list)) assets.push(await fileToAsset(file));
      onChange(multiple ? [...images, ...assets] : assets.slice(0, 1));
    } catch (e) {
      setError(e instanceof InvalidImageError ? e.message : "تعذر تحميل الصورة.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-7 text-center transition-colors hover:border-accent hover:bg-secondary"
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">{busy ? "جارٍ التحميل…" : buttonLabel}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-md border border-border bg-muted"
            >
              <img src={img.dataUrl} alt={img.name} className="aspect-4/3 w-full object-cover" />
              {mainId === img.id && (
                <span className="absolute top-1 right-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  الصورة الأساسية
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-primary/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-primary-foreground hover:bg-primary"
                  onClick={() => setPreview(img.dataUrl)}
                  aria-label="معاينة"
                >
                  <Eye className="size-3.5" />
                </Button>
                {onSetMain && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-primary-foreground hover:bg-primary"
                    onClick={() => onSetMain(img.id)}
                    aria-label="اجعلها الأساسية"
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-primary-foreground hover:bg-primary"
                  onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                  aria-label="حذف"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{img.name}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && <img src={preview} alt="معاينة" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
