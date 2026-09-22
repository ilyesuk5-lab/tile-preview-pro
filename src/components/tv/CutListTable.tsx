import type { CutGroup } from "@/lib/tilevision/types";

export function CutListTable({ cutList }: { cutList: CutGroup[] }) {
  if (cutList.length === 0)
    return <p className="text-sm text-muted-foreground">لا توجد قصاصات — كل البلاطات كاملة.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-right">
            <th className="py-2 font-medium text-muted-foreground">مقاس القصاصة</th>
            <th className="py-2 font-medium text-muted-foreground">العدد</th>
            <th className="py-2 font-medium text-muted-foreground">من بلاطة واحدة</th>
            <th className="py-2 font-medium text-muted-foreground">بلاطات مطلوبة</th>
          </tr>
        </thead>
        <tbody>
          {cutList.map((c) => (
            <tr key={`${c.width}x${c.height}`} className="border-b border-border/60 last:border-0">
              <td className="py-2 font-mono">
                {c.width} × {c.height} سم
              </td>
              <td className="py-2">{c.count}</td>
              <td className="py-2 text-muted-foreground">{c.perTile}</td>
              <td className="py-2 font-medium">{c.tilesNeeded}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
