import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog({ open, title, description, children, onClose, wide = false }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-lg border border-border bg-background shadow-2xl ${wide ? "max-w-6xl" : "max-w-xl"}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-5">
          <div><h2 className="text-xl font-semibold">{title}</h2>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
