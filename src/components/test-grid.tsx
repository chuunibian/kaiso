// ImageGrid.tsx
import { forwardRef, useRef } from "react";
import { VirtuosoGrid, VirtuosoProps, type ListRange } from "react-virtuoso";
import { invoke } from "@tauri-apps/api/core";

import { Skeleton } from "./ui/skeleton";
import { useGridStore, useBottomBarStore, useConfigStore, useOverviewPanelStore } from "../lib/store";
import type { ImageView } from "../lib/types";
import { formatSize } from "../lib/utils";

// one batched backend call for a window of ids
async function fetchBatch(ids: number[]): Promise<ImageView[]> {
    return invoke<ImageView[]>("lazy_load_data", { ids });
}


// truncate a filename in the middle: "Screenshot_20250101_abcdef.png" → "Scree…def.png"
function truncateFilename(name: string, maxLen = 18): string {
    if (name.length <= maxLen) return name;
    const ext = name.lastIndexOf(".") !== -1 ? name.slice(name.lastIndexOf(".")) : "";
    const base = name.slice(0, name.length - ext.length);
    const keep = maxLen - ext.length - 1; // 1 char for ellipsis
    if (keep <= 4) return name.slice(0, maxLen - 1) + "…";
    const front = base.slice(0, Math.ceil(keep / 2));
    const back = base.slice(base.length - Math.floor(keep / 2));
    return `${front}…${back}${ext}`;
}

// grid cell — file-manager thumbnail style
function ImageCell({ id, score }: { id: number; score: number }) {
    const row = useGridStore((s) => s.cache.get(id));
    const setPreviewFlag = useConfigStore((s) => s.setPreviewFlag);
    const setCurrentPreviewPath = useConfigStore((s) => s.setCurrentPreviewPath);
    const setCurrentSelectedImage = useOverviewPanelStore((s) => s.setSelectedImage);

    // for handling clicks
    const handleClick = (imgPath: string) => {
        setCurrentSelectedImage({ id: 0, name: row.name, path: row.path, albumName: "", size: row.meta.size, dimension: { width: 0, height: 0 }, createdAt: { secs_since_epoch: 0, nanos_since_epoch: 0 }, modifiedAt: { secs_since_epoch: 0, nanos_since_epoch: 0 } })
    };

    const handleDoubleClick = (imgPath: string) => {
        setCurrentPreviewPath(imgPath);
        setPreviewFlag(true);
    };

    // skeleton placeholder while uncached
    if (!row) {
        return (
            <div className="h-[280px] flex flex-col items-center p-1 select-none">
                <Skeleton className="w-full flex-1 rounded-3xl bg-zinc-800" />
                <div className="w-full mt-2 space-y-1 flex flex-col items-center">
                    <Skeleton className="h-3 w-4/5 bg-zinc-800" />
                    <Skeleton className="h-2.5 w-3/5 bg-zinc-800/60" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="group h-[280px] flex flex-col items-center p-1 rounded-3xl cursor-default select-none
                       hover:bg-zinc-800/30 transition-colors duration-150"
            onDoubleClick={() => handleDoubleClick(row.path)}
            onClick={() => handleClick(row.path)}
        >
            {/* Square thumbnail */}
            <div className="w-full flex-1 min-h-0 bg-zinc-900 rounded-3xl overflow-hidden border-2 border-transparent
                            group-hover:border-pink-400/70 transition-all duration-150 relative">
                <img
                    src={row.thumbLink}
                    alt={row.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
                {/* Confidence score badge */}
                <div className="absolute top-0.5 right-0.5 bg-black/60 backdrop-blur-xs text-[11px] text-white/80 group-hover:text-pink-300 transition-colors duration-150 px-1 py-px rounded-sm font-mono leading-none select-none">
                    {score.toFixed(4)}
                </div>
            </div>

            {/* File info below thumbnail */}
            <div className="w-full mt-2 px-0.5 min-w-0 text-center">
                <div
                    className="text-[12px] leading-tight text-zinc-400 group-hover:text-zinc-100 transition-colors duration-150 truncate"
                    title={row.name}
                >
                    {truncateFilename(row.name)}
                </div>
                <div className="text-[10px] leading-tight text-zinc-600 group-hover:text-zinc-400 transition-colors duration-150 truncate select-none">
                    {row.meta?.size ? formatSize(row.meta.size) : "—"}
                </div>
            </div>
        </div>
    );
}

// Stable ref live outside of VirtusosGrid so it
// doesn't remount the scroll container on every parent re-render.
const Scroller = forwardRef<HTMLDivElement, any>(
    (props, ref) => <div {...props} ref={ref} className="scrollbar-thin" />
);

export default function TestGrid() {
    const orderedIds = useGridStore((s) => s.orderedIds);
    const setRange = useBottomBarStore((s) => s.setRange);
    const setStatus = useBottomBarStore((s) => s.setStatus);

    // simple inline debounce so a fast scrub doesn't fire mid-flight
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const onRangeChanged = (range: ListRange) => {
        clearTimeout(timer.current);
        setRange(range);
        // setTimeout schedules a function to run debounced time later 
        // that funciton is async
        // this is hacky way to deal with the scrolling debounce
        timer.current = setTimeout(() => {
            // read store imperatively here — we don't want this callback to subscribe
            const { cache, orderedIds, addToCache } = useGridStore.getState();

            const missing: number[] = [];
            for (let i = range.startIndex; i <= range.endIndex; i++) {
                const id = orderedIds[i]?.id;
                if (id != null && !cache.has(id)) missing.push(id); // only un-cached ids
            }
            if (missing.length === 0) return;

            fetchBatch(missing).then((fetchedData) => {
                console.log(fetchedData)
                addToCache(fetchedData);
            });

        }, 120);
    };

    return (
        <div className="h-full flex flex-col flex-1 min-w-0">
            <div className="w-full h-full flex-1 min-h-0">
                <VirtuosoGrid
                    style={{ height: "100%", width: "100%" }}
                    totalCount={orderedIds.length}
                    itemContent={(i) => <ImageCell id={orderedIds[i].id} score={orderedIds[i].confidence_score} />}
                    rangeChanged={onRangeChanged}
                    isScrolling={(s) => setStatus(s)}
                    increaseViewportBy={400}
                    listClassName="flex flex-wrap p-2"
                    itemClassName="w-1/8 p-1 box-border"
                    className="h-full w-full bg-zinc-950"
                    components={{ Scroller }}
                />
            </div>
        </div>
    );
}