import { useBottomBarStore, useOverviewPanelStore, useGridStore, useConfigStore } from "../lib/store";
import { formatSize } from "../lib/utils";
import { ZoomIn } from "lucide-react";

function formatDimension(dim?: { width: number; height: number }): string {
  if (!dim || (!dim.width && !dim.height)) return "—";
  return `${dim.width} × ${dim.height} PX`;
}

function formatDate(time?: { secs_since_epoch: number }): string {
  if (!time || !time.secs_since_epoch) return "—";
  const d = new Date(time.secs_since_epoch * 1000);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const BottomMdBar = () => {
  const status = useBottomBarStore((s) => s.status);
  const range = useBottomBarStore((s) => s.range);
  const zoomLevel = useBottomBarStore((s) => s.zoomLevel);

  const hoveredImage = useOverviewPanelStore((s) => s.hoveredImage);
  const selectedImage = useOverviewPanelStore((s) => s.selectedImage);
  const orderedIds = useGridStore((s) => s.orderedIds);
  const previewFlag = useConfigStore((s) => s.previewFlag);

  const hasSelectedImage = Boolean(selectedImage && (selectedImage.id > 0 || selectedImage.name !== ""));
  const activeImage = hoveredImage || (hasSelectedImage ? selectedImage : null);

  let itemIndex = -1;
  if (activeImage && activeImage.id) {
    itemIndex = orderedIds.findIndex((item) => item.id === activeImage.id);
  }
  const itemNumber = itemIndex >= 0 ? itemIndex + 1 : null;
  const totalCount = orderedIds.length;

  return (
    <div className="bg-secondary border-t border-border text-secondary-foreground text-xs font-mono h-7 px-3.5 flex items-center justify-between select-none uppercase tracking-wider overflow-hidden">
      {/* Left section: status indicator, grid scroll range, and item index (X / Y) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 font-bold">
          <style>{`
            @keyframes rotate-square {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(90deg); }
            }
          `}</style>
          <span
            className="inline-block w-[9px] h-[9px] rounded-[1px]"
            style={{
              backgroundColor: 'var(--primary)',
              animation: status ? 'rotate-square 0.8s steps(2) infinite' : 'none',
              opacity: status ? 1 : 0.4,
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>
        <span className="text-pink-400/80 font-bold select-none">|</span>
        <span className="font-semibold text-muted-foreground">{range.startIndex} - {range.endIndex}</span>

        {itemNumber !== null && (
          <>
            <span className="text-pink-400/80 font-bold select-none">|</span>
            <span className="font-semibold text-foreground">
              {itemNumber} / {totalCount}
            </span>
          </>
        )}
      </div>

      {/* Right section: Zoom (if viewing), Name, Size, Dimensions, Created Date */}
      {activeImage && (
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          {previewFlag && (
            <>
              <span className="flex items-center gap-1 text-muted-foreground font-medium">
                <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground">{Math.round(zoomLevel * 100)}%</span>
              </span>
              <span className="text-pink-400/80 font-bold select-none">|</span>
            </>
          )}

          {activeImage.name && (
            <span className="text-muted-foreground truncate max-w-[200px]" title={activeImage.name}>
              NAME: <span className="text-foreground">{activeImage.name}</span>
            </span>
          )}

          <span className="text-pink-400/80 font-bold select-none">|</span>
          <span className="text-muted-foreground">
            SIZE: <span className="text-foreground">{activeImage.size ? formatSize(activeImage.size) : "—"}</span>
          </span>

          <span className="text-pink-400/80 font-bold select-none">|</span>
          <span className="text-muted-foreground">
            DIM: <span className="text-foreground">{formatDimension(activeImage.dimension)}</span>
          </span>

          <span className="text-pink-400/80 font-bold select-none">|</span>
          <span className="text-muted-foreground">
            CREATED: <span className="text-foreground">{formatDate(activeImage.createdAt)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default BottomMdBar;
