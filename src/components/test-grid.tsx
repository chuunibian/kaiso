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
import { useRef } from "react";
import { VirtuosoGrid, type ListRange } from "react-virtuoso";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { useGridStore, useBottomBarStore } from "../lib/store";
import type { ImageView } from "../lib/types";

// one batched backend call for a window of ids
async function fetchBatch(ids: number[]): Promise<ImageView[]> {
    return invoke<ImageView[]>("lazy_load_data", { ids });
}

// ── the cell: subscribes to ITS id's cache slot, skeleton on miss ──
function ImageCell({ id, score }: { id: number, score: number }) {
    const row = useGridStore((s) => s.cache.get(id)); // re-renders only when THIS id lands

    if (!row) {
        return (
            <Card className="h-48 overflow-hidden bg-card">
                <Skeleton className="w-full h-36 rounded-t-md bg-zinc-800" />
                <div className="p-1.5 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/4" />
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-48 overflow-hidden group hover:border-primary/50 hover:shadow-md transition-all duration-200 relative bg-card">
            {/* Image Container */}
            <div className="w-full h-36 bg-muted overflow-hidden relative">
                <img 
                    src={row.thumbLink} 
                    alt={row.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                {/* Floating Confidence Score Badge */}
                <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-xs text-[9px] text-white px-1 py-0.5 rounded font-mono font-medium select-none">
                    {score.toFixed(4)}
                </div>
            </div>
            
            {/* Info Footer */}
            <div className="p-1.5 flex flex-col justify-center h-12">
                <div className="text-[10px] font-semibold truncate text-foreground leading-tight" title={row.name}>
                    {row.name}
                </div>
                <div className="text-[9px] text-muted-foreground truncate leading-normal select-none">
                    {row.meta?.size ? `${(row.meta.size / 1024).toFixed(0)} KB` : "image file"}
                </div>
            </div>
        </Card>
    );
}

export default function TestGrid() {
    const orderedIds = useGridStore((s) => s.orderedIds);
    const setRange = useBottomBarStore((s) => s.setRange);
    const setStatus = useBottomBarStore((s) => s.setStatus);
    const setBottomStatus = useBottomBarStore((s) => s.setBottomStatus);

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

            fetchBatch(missing).then(addToCache); // one call -> one batched cache write
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
                    listClassName="flex flex-wrap p-2 gap-y-2"
                    itemClassName="w-1/8 px-1 box-border"
                    className="h-full w-full border-t border-r"
                />
            </div>
        </div>
    );
}