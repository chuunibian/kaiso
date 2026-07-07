// import { forwardRef, useState } from "react";
// import { Button } from "@/components/ui/button";
// import {
//     Card,
//     CardContent,
//     CardDescription,
//     CardFooter,
//     CardHeader,
//     CardTitle,
// } from "@/components/ui/card";
// import { VirtuosoGrid } from "react-virtuoso";

// const ItemWrapper = ({ children, ...props }) => (
//     <div
//         {...props}
//         style={{
//             display: 'flex',
//             flex: 1,
//             textAlign: 'center',
//             padding: '1rem 1rem',
//             border: '1px solid gray',
//             whiteSpace: 'nowrap',
//         }}
//     >
//         {children}
//     </div>
// )

// function TestGrid() {

//     return (
//         <div className="h-full flex flex-col flex-1 min-w-0">
//             <div className="w-full px-4 py-4 flex-1 min-h-0">
//                 {/* There is a call back function which contains the html to render for each row so you pass in 
//         data for ti to render that render function is hte itemContent={(index, item)=><CustomCell>}

//         <VirtuosoGrid
//             data={items}
//             itemContent={(index, item) => <Card {...item} />}
//         />

//         for item content it calls a callback and injects parameters into it, you get the index by default
//         then you also need ot pass in the item which rep the data you pass in

//         <VirtuosoGrid
//           data={items}
//           itemContent={(index, item) => <Card {...item} />}
//         />

//         ^ example and thne the item content needs special rendering

//           itemContent you can give it a lamdba and that lambda returns jsx specifically for that specific cell

//           the components prop into virtuoso grid overrides the lastclassname and itemclassname
//           the listclassname applies to virtuoso list div and itemclassname applies to each virtuoso item div

//           Note taht the itemclassname is important since the width of it sets the columns per row 
//           Note if we wanted to have an option to view x amount per row we can just use a state var insite of the itemclassname value
//           since it is a string just use ${}
//         */}


//                 {/* 

//             How to handle lazy loading?

//             right but in those functions it can tell when it is scrolling and you can tell where the rangeChanged and scrollng rate but where does it allow you to know what is mounted at that moment? I assume the callback used to render the on DOM rows is itemContent so that is where we would need to either 1 lazy load or check the map if it is in the use the cached data to render, the image link would get either from cache or from the lazy load (but does the browser handle the laoding of the img itself?) But another concern is on each scroll of virtualization that itemcontent call back runs each time meaning that process needs to run ecah time even though we cache would it be possible that it is inefficent?

//             ^ above is ok but that would be individual and not batched 

//             Apparently you can also do it batched 
//             rangechanged will hand over the entire window [startindex, endindex]
//             but then not sure since rangechanged callback is isolated of those cells callback

//             I was told one way is after the range query gets the data you force trigger a reredner of the map which
//             then the itemsContent that are mounted rerenders and is synced but that is not the most effiecnt 
//         */}


//                 {
//                     /*
//                         For the frontend data store

//                         we will have 2 datastruct 

//                         1. orderedIds
//                         2. cache

//                         the cache has key as the id and the value is the row

//                         itemContent will need need its own nice function to pass in to render

//                     */
//                 }

//                 <VirtuosoGrid
//                     style={{ height: "100%" }}
//                     totalCount={1000}
//                     // itemContent={(i) => <ItemWrapper>Item {i}</ItemWrapper>}
//                     itemContent={(i) => <Card><CardHeader><CardTitle> <img src={`https://picsum.photos/seed/${i}/300/200`} alt={`Mock item ${i}`}
//                         className="w-full h-40 object-cover rounded-t-md" /> Item {i}</CardTitle></CardHeader></Card>}
//                     listClassName="flex flex-wrap"
//                     itemClassName="w-1/5 p-1 box-border"
//                     className="border p-4"
//                 />
//             </div>
//         </div>
//     );
// }

// export default TestGrid;


/*
    
What rangeChanged injects: a single ListRange object, { startIndex: number, endIndex: number } — the inclusive index bounds of the currently-rendered window. That's it, one arg. So rangeChanged={(range) => …} gives you range.startIndex and range.endIndex, and those are positions in your orderedIds array, not ids. You map them through to get ids:





*/

// import { useState } from "react";
// import {
//     Card,
//     CardHeader,
//     CardTitle,
// } from "@/components/ui/card";
// import { VirtuosoGrid } from "react-virtuoso";
// import { Skeleton } from "./ui/skeleton";

// function TestGrid() {
//     // state just so we can SEE the signals on screen
//     const [range, setRange] = useState({ startIndex: 0, endIndex: 0 }); // rangeChanged
//     const [scrolling, setScrolling] = useState(false);                  // isScrolling
//     const [atBottom, setAtBottom] = useState(false);                    // atBottomStateChange
//     const [seeking, setSeeking] = useState(false);                      // scrollSeekConfiguration
//     const [velocity, setVelocity] = useState(0);                        // velocity from change()

//     return (
//         <div className="h-full flex flex-col flex-1 min-w-0">
//             {/* live readout of what Virtuoso is telling us */}
//             <div className="px-4 py-2 font-mono text-sm bg-neutral-705 border-b flex gap-4 flex-wrap">
//                 <span>visible: {range.startIndex}–{range.endIndex}</span>
//                 <span>{scrolling ? "scrolling…" : "idle"}</span>
//                 {/* <span>{seeking ? `seeking (v=${Math.round(velocity)})` : "—"}</span> */}
//                 <span>{atBottom ? "at bottom" : ""}</span>
//             </div>

//             <div className="w-full px-4 py-4 flex-1 min-h-0">
//                 <VirtuosoGrid
//                     style={{ height: "100%" }}
//                     totalCount={1000}
//                     itemContent={(i) => (
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>
//                                     <img
//                                         src={`https://picsum.photos/seed/${i}/300/200`}
//                                         alt={`Mock item ${i}`}
//                                         className="w-full h-40 object-cover rounded-t-md"
//                                     />
//                                     Item {i}
//                                 </CardTitle>
//                             </CardHeader>
//                         </Card>
//                     )}

//                     // fires every time the visible window shifts (this is the batch hook later)
//                     rangeChanged={(r) => setRange(r)}

//                     // fires true on scroll-start, false on stop
//                     isScrolling={(s) => setScrolling(s)}

//                     // fires when you hit the bottom (the "load more" hook you're NOT using)
//                     atBottomStateChange={(b) => setAtBottom(b)}

//                     // renders extra rows just outside the viewport (px buffer)
//                     increaseViewportBy={400}

//                     // fast-scroll detection: enter/exit by velocity, change() streams velocity
//                     scrollSeekConfiguration={{
//                         enter: (v) => Math.abs(v) > 300,
//                         exit: (v) => Math.abs(v) < 50,
//                         change: (v) => { setSeeking(Math.abs(v) > 50); setVelocity(v); },
//                     }}
//                     // what to show INSTEAD of the real card while scrolling fast
//                     components={{
//                         ScrollSeekPlaceholder: ({ height, width }) => (
//                             <div style={{ height, width }} className="p-1">
//                                 <Skeleton className="w-full h-full" />
//                             </div>
//                         ),
//                     }}

//                     listClassName="flex flex-wrap"
//                     itemClassName="w-1/5 p-1 box-border"
//                     className="border p-4"
//                 />
//             </div>
//         </div>
//     );
// }

// export default TestGrid;


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

export default function TestGrid() {
    const orderedIds = useGridStore((s) => s.orderedIds);
    const setRange = useBottomBarStore((s) => s.setRange);
    const setStatus = useBottomBarStore((s) => s.setStatus);

    // simple inline debounce so a fast scrub doesn't fire mid-flight
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // scroll bar mod
    const Scroller = forwardRef<HTMLDivElement, VirtuosoProps<any, any>['components']['Scroller']>(
        (props, ref) => <div {...props} ref={ref} className="custom-scroll" />
    )

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
                />
            </div>
        </div>
    );
}