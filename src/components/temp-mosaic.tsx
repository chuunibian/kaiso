import { useMemo, useEffect } from "react";
import { useConfigStore, useFrontendProgressStore } from "@/lib/store";
import {
    Circle,
    FolderSearch,
    ImageIcon,
    Brain,
    Database,
    CheckCircle2,
    LoaderIcon,
    type LucideIcon,
} from "lucide-react";


// Fixed grid. The mosaic is a progress bar that happens to look like a
// library — tiles are NOT mapped 1:1 to images (you'd get 3 tiles or 100k).
const COLS = 20;
const ROWS = 12;
const TILE_COUNT = COLS * ROWS;
const EMPTY_TILE = "#0c0c0c";

// Muted, photo-thumbnail-ish colors so filled tiles read as "images".
// Tune toward what your actual libraries look like.
const PALETTE = [
    "#3a4657", "#57493a", "#465738", "#573a49", "#3a5757", "#454557",
    "#63563a", "#3a5749", "#4a3a57", "#575345", "#3a4a57", "#573a3a",
];

/** Maps the textStatus string from the backend to a Lucide icon + color + animation. */
function statusIcon(status: string): { Icon: LucideIcon; color: string; anim: string } {
    if (status.includes("Scanning")) return { Icon: FolderSearch, color: "text-amber-400", anim: "animate-pulse" };
    if (status.includes("Preprocessing")) return { Icon: ImageIcon, color: "text-sky-400", anim: "animate-spin" };
    if (status.includes("Embedding")) return { Icon: Brain, color: "text-violet-400", anim: "animate-pulse" };
    if (status.includes("database")) return { Icon: Database, color: "text-emerald-400", anim: "animate-spin" };
    if (status.includes("Finalizing")) return { Icon: CheckCircle2, color: "text-green-400", anim: "animate-bounce" };
    return { Icon: Circle, color: "text-neutral-600", anim: "" };
}

export function IndexingView() {

    const count = useFrontendProgressStore((s) => s.count);
    const total = useFrontendProgressStore((s) => s.total);
    const textStatus = useFrontendProgressStore((s) => s.textStatus);
    const currentWorkspace = useConfigStore((s) => s.currentWorkspace);

    const setCount = useFrontendProgressStore((s) => s.setCount);
    const setTotal = useFrontendProgressStore((s) => s.setTotal);
    const setTextStatus = useFrontendProgressStore((s) => s.setTextStatus);

    const pct = total > 0 ? Math.floor((count / total) * 100) : 0;
    const tilesToFill = total > 0 ? Math.floor((count / total) * TILE_COUNT) : 0;

    const { revealRank, colors } = useMemo(() => {
        const order = Array.from({ length: TILE_COUNT }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        // revealRank[tileIndex] = position in the reveal order
        const revealRank = new Array<number>(TILE_COUNT);
        order.forEach((tileIndex, position) => {
            revealRank[tileIndex] = position;
        });
        const colors = Array.from(
            { length: TILE_COUNT },
            () => PALETTE[Math.floor(Math.random() * PALETTE.length)]
        );
        return { revealRank, colors };
    }, []);

    useEffect(() => {
        setCount(0);
        setTotal(0);
        setTextStatus("Idle");
    }, [])

    const { Icon, color, anim } = statusIcon(textStatus); // get status icon
    const isActive = textStatus !== "Idle";

    return (
        <div className="flex h-full flex-col flex-1 min-w-0 bg-black font-mono text-neutral-300">
            {/* top status strip */}
            <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                    {/* status icon with Loader spinner ring */}
                    <div className={`relative flex items-center justify-center h-6 w-6 ${color}`}>
                        {/* {isActive && (
                            <LoaderIcon className="absolute h-7 w-7 animate-spin opacity-100" />
                        )} */}
                        <Icon className={`h-5 w-5 ${anim}`} />
                    </div>

                    <span className={`text-xs tracking-wide ${isActive ? "text-neutral-300" : "text-neutral-600"}`}>
                        {textStatus}
                    </span>

                    {isActive && (
                        <>
                            <span className="text-[10px] text-neutral-700">·</span>
                            <span className="text-xs tabular-nums text-neutral-500">
                                {count.toLocaleString()}
                                <span className="text-neutral-700"> / </span>
                                {total.toLocaleString()}
                            </span>
                        </>
                    )}
                </div>

                {isActive && (
                    <div className="flex items-baseline gap-1 tabular-nums">
                        <span className="text-lg font-medium text-white">{pct}</span>
                        <span className="text-[10px] text-neutral-600">%</span>
                    </div>
                )}
            </div>

            {/* mosaic = the grid region */}
            <div
                className="grid flex-1 gap-[3px] px-5 py-3.5"
                style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: TILE_COUNT }, (_, i) => {
                    const filled = revealRank[i] < tilesToFill;
                    return (
                        <div
                            key={i}
                            className="rounded-[1px] transition-colors duration-700 ease-out"
                            style={{ backgroundColor: filled ? colors[i] : EMPTY_TILE }}
                        />
                    );
                })}
            </div>

            {/* bottom status strip */}
            {/* <div className="flex items-center justify-between border-t border-neutral-900 px-5 py-3 tabular-nums">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5ce0d8]" />
                    <span className="text-[11px] text-neutral-400">{status}</span>
                </div>
                <span className="text-[11px] text-neutral-500">
                    <span className="text-neutral-300">{indexed.toLocaleString()}</span>
                    {" / "}
                    {total.toLocaleString()}
                </span>
            </div> */}
        </div>
    );
}

// import { useEffect, useMemo, useState } from "react";
// import { Progress } from "@/lib/types";
// import { useConfigStore } from "@/lib/store";

// // Fixed grid. The mosaic is a progress bar that happens to look like a
// // library — tiles are NOT mapped 1:1 to images.
// const COLS = 20;
// const ROWS = 12;
// const TILE_COUNT = COLS * ROWS;
// const EMPTY_TILE = "#0c0c0c";

// const PALETTE = [
//     "#3a4657", "#57493a", "#465738", "#573a49", "#3a5757", "#454557",
//     "#63563a", "#3a5749", "#4a3a57", "#575345", "#3a4a57", "#573a3a",
// ];

// // ---- mock feed config ----
// const MOCK_TOTAL = 100_000;
// const TICK_MS = 120;          // how often the fake feed advances
// const STEP_MIN = 500;         // images per tick (min)
// const STEP_MAX = 760;         // images per tick (max)
// const DISCOVERY_MS = 1600;    // time spent "walking folders" before total is known

// /**
//  * Drop-in mock of IndexingView. Same layout/styling as the real component,
//  * but drives itself so you can see it in your app with no backend wired up.
//  * It loops forever. Delete this file (or the useEffect) once you connect
//  * real events.
//  */
// export function IndexingViewMock({ workspaceName = "Pixel7Screenshots" }: { workspaceName?: string }) {
//     const [indexed, setIndexed] = useState(0);
//     const [total, setTotal] = useState(0); // 0 = still discovering
//     const [status, setStatus] = useState("walking folders…");
//     const [runId, setRunId] = useState(0); // bump to reset the mosaic each loop

//     useEffect(() => {
//         let indexedLocal = 0;
//         let batch = 0;
//         let interval: ReturnType<typeof setInterval>;

//         // phase 1: discovery
//         const discoveryTimer = setTimeout(() => {
//             setTotal(MOCK_TOTAL);
//             // phase 2: encoding
//             interval = setInterval(() => {
//                 indexedLocal = Math.min(
//                     MOCK_TOTAL,
//                     indexedLocal + STEP_MIN + Math.floor(Math.random() * (STEP_MAX - STEP_MIN))
//                 );
//                 batch += 1;
//                 setIndexed(indexedLocal);
//                 setStatus(indexedLocal >= MOCK_TOTAL ? "finalizing index" : `encoding batch ${292 + batch}`);

//                 if (indexedLocal >= MOCK_TOTAL) {
//                     clearInterval(interval);
//                     // phase 3: pause, then loop the whole thing
//                     setTimeout(() => {
//                         setIndexed(0);
//                         setTotal(0);
//                         setStatus("walking folders…");
//                         setRunId((r) => r + 1); // remount mosaic → fresh shuffle + cleared tiles
//                     }, 1800);
//                 }
//             }, TICK_MS);
//         }, DISCOVERY_MS);

//         return () => {
//             clearTimeout(discoveryTimer);
//             clearInterval(interval);
//         };
//     }, [runId]);

//     return <IndexingViewInner workspaceName={workspaceName} indexed={indexed} total={total} status={status} runId={runId} />;
// }

// interface InnerProps {
//     workspaceName: string;
//     indexed: number;
//     total: number;
//     status: string;
//     runId: number;
// }

// function IndexingViewInner({ workspaceName, indexed, total, status, runId }: InnerProps) {
//     const pct = total > 0 ? Math.floor((indexed / total) * 100) : 0;
//     const tilesToFill = total > 0 ? Math.floor((indexed / total) * TILE_COUNT) : 0;

//     // stable-per-run shuffled reveal order + fixed color per tile
//     const { revealRank, colors } = useMemo(() => {
//         const order = Array.from({ length: TILE_COUNT }, (_, i) => i);
//         for (let i = order.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [order[i], order[j]] = [order[j], order[i]];
//         }
//         const revealRank = new Array<number>(TILE_COUNT);
//         order.forEach((tileIndex, position) => {
//             revealRank[tileIndex] = position;
//         });
//         const colors = Array.from(
//             { length: TILE_COUNT },
//             () => PALETTE[Math.floor(Math.random() * PALETTE.length)]
//         );
//         return { revealRank, colors };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [runId]);

//     const done = total > 0 && indexed >= total;

//     return (
//         <div className="flex h-full flex-col flex-1 min-w-0 bg-black font-mono text-neutral-300">
//             {/* top status strip */}
//             <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-3.5">
//                 <div className="flex items-baseline gap-3">
//                     <span className="text-[11px] uppercase tracking-[0.2em] text-[#5ce0d8]">Indexing</span>
//                     <span className="text-xs text-neutral-400">{workspaceName}</span>
//                     <span className="text-[11px] text-neutral-600">— building embeddings, one-time</span>
//                 </div>
//                 <div className="flex items-baseline gap-1.5 tabular-nums">
//                     <span className="text-xl text-white">{pct}</span>
//                     <span className="text-xs text-neutral-500">%</span>
//                 </div>
//             </div>

//             {/* mosaic = the grid region */}
//             <div
//                 className="grid flex-1 gap-[3px] px-5 py-3.5"
//                 style={{
//                     gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
//                     gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
//                 }}
//             >
//                 {Array.from({ length: TILE_COUNT }, (_, i) => {
//                     const filled = revealRank[i] < tilesToFill;
//                     return (
//                         <div
//                             key={i}
//                             className="rounded-[1px] transition-colors duration-700 ease-out"
//                             style={{ backgroundColor: filled ? colors[i] : EMPTY_TILE }}
//                         />
//                     );
//                 })}
//             </div>

//             {/* bottom status strip */}
//             <div className="flex items-center justify-between border-t border-neutral-900 px-5 py-3 tabular-nums">
//                 <div className="flex items-center gap-2">
//                     <span
//                         className={`h-1.5 w-1.5 rounded-full ${done ? "bg-neutral-500" : "animate-pulse bg-[#5ce0d8]"}`}
//                     />
//                     <span className="text-[11px] text-neutral-400">{status}</span>
//                 </div>
//                 <span className="text-[11px] text-neutral-500">
//                     <span className="text-neutral-300">{indexed.toLocaleString()}</span>
//                     {" / "}
//                     {total.toLocaleString()}
//                 </span>
//             </div>
//         </div>
//     );
// }