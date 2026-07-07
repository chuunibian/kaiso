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
