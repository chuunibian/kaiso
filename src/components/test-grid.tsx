// ImageGrid.tsx
import { forwardRef, useEffect, useRef } from "react";
import { VirtuosoGrid, VirtuosoProps, type ListRange } from "react-virtuoso";
import { invoke } from "@tauri-apps/api/core";
import { Check } from "lucide-react";

import { Skeleton } from "./ui/skeleton";
import { virtuosoGridRef } from "../lib/grid-ref";
import { useGridStore, useBottomBarStore, useConfigStore, useOverviewPanelStore, useTopBarStateStore, useSelectedEntitiesStore, handleBackendError } from "../lib/store";
import type { ImageView } from "../lib/types";
import { formatSize } from "../lib/utils";

// one batched backend call for a window of ids
async function fetchBatch(ids: number[]): Promise<ImageView[]> {
    try {
        return await invoke<ImageView[]>("lazy_load_data", { ids });
    } catch (e) {
        handleBackendError(e);
        return [];
    }
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
    const setCurrentPreviewId = useConfigStore((s) => s.setCurrentPreviewId);
    const setCurrentSelectedImage = useOverviewPanelStore((s) => s.setSelectedImage);
    const setHoveredImage = useOverviewPanelStore((s) => s.setHoveredImage);
    const isSelected = useSelectedEntitiesStore((s) => s.selectedSet.has(id));
    const toggleSelected = useSelectedEntitiesStore((s) => s.toggleSelectedSet);
    const multiSelectMode = useSelectedEntitiesStore((s) => s.multiSelectMode);

    // for handling clicks
    const handleClick = (imgPath: string) => {
        if (multiSelectMode) {
            toggleSelected(id);
        }
        if (row) {
            setCurrentSelectedImage({
                id,
                name: row.name,
                path: row.path,
                albumName: "",
                size: row.meta.size,
                dimension: row.meta.dimensions || { width: 0, height: 0 },
                createdAt: row.meta.date_created,
                modifiedAt: row.meta.date_modified,
            });
        }
    };

    const handleDoubleClick = (imgPath: string) => {
        setCurrentPreviewPath(imgPath);
        setCurrentPreviewId(id);
        setPreviewFlag(true);
    };

    const handleMouseEnter = () => {
        if (row) {
            setHoveredImage({
                id,
                name: row.name,
                path: row.path,
                albumName: "",
                size: row.meta.size,
                dimension: row.meta.dimensions || { width: 0, height: 0 },
                createdAt: row.meta.date_created,
                modifiedAt: row.meta.date_modified,
            });
        }
    };

    const handleMouseLeave = () => {
        setHoveredImage(null);
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
            className={`group h-[280px] flex flex-col items-center p-1 rounded-3xl cursor-default select-none
                       transition-colors duration-150 ${isSelected ? 'bg-pink-500/10' : 'hover:bg-zinc-800/30'}`}
            onDoubleClick={() => handleDoubleClick(row.path)}
            onClick={() => handleClick(row.path)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Square thumbnail */}
            <div className={`w-full flex-1 min-h-0 bg-zinc-900 rounded-3xl overflow-hidden border-2 transition-all duration-150 relative
                            ${isSelected ? 'border-pink-400' : 'border-transparent group-hover:border-pink-400/70'}`}>
                <img
                    src={row.thumbLink}
                    alt={row.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                />
                {/* Selected check icon */}
                {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                )}
                {/* Confidence score badge */}
                <div className="absolute top-0.5 right-0.5 bg-black/75 text-[11px] text-white/80 group-hover:text-pink-300 transition-colors duration-150 px-1 py-px rounded-sm font-mono leading-none select-none">
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
    const gridSize = useTopBarStateStore((s) => s.gridSize);

    // Static map so Tailwind sees each class at build time (dynamic interpolation gets purged)
    const gridColClass: Record<number, string> = {
        1: "w-1/1",
        2: "w-1/2",
        3: "w-1/3",
        4: "w-1/4",
        5: "w-1/5",
        6: "w-1/6",
        7: "w-1/7",
        8: "w-1/8",
        9: "w-1/9",
    };

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

    // For when orderIds change force a same lazy load fetch logic for the current window or range 
    // this prevents the issue of cells getting stuck on skeleton (and needing to force the rerender)
    useEffect(() => {
        if (orderedIds.length === 0) return;
        const { cache } = useGridStore.getState();
        const { range } = useBottomBarStore.getState();

        const missing: number[] = [];
        const rangeUpperBound = Math.min(range.endIndex, orderedIds.length - 1) // prevent oob if old range index > current ordered ids length
        for (let i = range.startIndex; i <= rangeUpperBound; i++) {
            const id = orderedIds[i]?.id;
            if (id != null && !cache.has(id)) {
                missing.push(id);
            }
        }
        if (missing.length === 0) return;

        fetchBatch(missing).then((fetchedData) => {
            useGridStore.getState().addToCache(fetchedData);
        });
    }, [orderedIds]);

    return (
        <div className="h-full flex flex-col flex-1 min-w-0">
            <div className="w-full h-full flex-1 min-h-0">
                <VirtuosoGrid
                    ref={virtuosoGridRef}
                    style={{ height: "100%", width: "100%" }}
                    totalCount={orderedIds.length}
                    itemContent={(i) => <ImageCell id={orderedIds[i].id} score={orderedIds[i].confidence_score} />}
                    rangeChanged={onRangeChanged}
                    isScrolling={(s) => setStatus(s)}
                    increaseViewportBy={200}
                    listClassName="flex flex-wrap p-2"
                    itemClassName={`${gridColClass[gridSize] ?? "w-1/7"} p-1 box-border`}
                    className="h-full w-full bg-zinc-950"
                    components={{ Scroller }}
                />
            </div>
        </div>
    );
}