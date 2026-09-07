// MOCK / WIREFRAME: what sits to the right of the search bar.
// Nothing here is wired up — all values are placeholders so the layout can be
// judged. Visual grammar deliberately mirrors the workspace info bar below it
// (rounded-xl / bg-muted/20 / border-border/50 / pink pipe separators).
import { Crosshair, ChevronDown, Timer, Layers, Pin } from "lucide-react";

// Same stages, same colors as the dots on the search bar — this is their
// numeric companion, so the two must stay in sync.
const STAGE_TIMINGS = [
  { id: "embed", label: "Query embedding", ms: 12, color: "bg-chart-1" },
  { id: "retrieve", label: "Vector retrieval", ms: 96, color: "bg-chart-2" },
  { id: "rerank", label: "CLIP rerank", ms: 154, color: "bg-chart-3" },
  { id: "fuse", label: "BLIP rerank", ms: 118, color: "bg-chart-5" },
];

const TOTAL_MS = STAGE_TIMINGS.reduce((sum, s) => sum + s.ms, 0);
const TIMING_BREAKDOWN = STAGE_TIMINGS.map((s) => `${s.label} ${s.ms}ms`).join(" · ");

const Pipe = () => (
  <span className="text-pink-400/80 font-mono text-[10px] select-none">|</span>
);

// Where the query is allowed to look. Mock dropdown trigger.
export const SearchScopePill = () => (
  <button
    type="button"
    title="Search scope — workspace / album / current selection (placeholder)"
    className="hidden md:flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-muted/20 border border-border/50 shadow-xs px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  >
    <Crosshair className="h-3.5 w-3.5 shrink-0" />
    <span className="leading-none">Workspace</span>
    <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
  </button>
);

// The numeric companion to the stage dots: how long each stage took, how wide
// the funnel was, and what came out the end.
export const SearchRunReadout = () => (
  <div className="hidden lg:flex h-10 shrink-0 items-center gap-1 rounded-xl bg-muted/20 border border-border/50 shadow-xs px-2 text-xs leading-none">
    {/* Latency + per-stage split, segments proportional to time spent */}
    <span
      className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-background/60 border border-border/40 text-muted-foreground font-mono"
      title={`Total ${TOTAL_MS}ms — ${TIMING_BREAKDOWN} (placeholder)`}
    >
      <Timer className="h-3 w-3" />
      <span className="tabular-nums">{TOTAL_MS}ms</span>
      <span className="flex h-1 w-12 overflow-hidden rounded-full bg-border/60">
        {STAGE_TIMINGS.map((stage) => (
          <span key={stage.id} className={stage.color} style={{ flexGrow: stage.ms }} />
        ))}
      </span>
    </span>

    <Pipe />

    <span
      className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-background/60 border border-border/40 text-muted-foreground font-mono"
      title="Candidates scanned → survived rerank (placeholder)"
    >
      <Layers className="h-3 w-3" />
      <span className="tabular-nums">12.4k</span>
      <span className="opacity-60">→</span>
      <span className="tabular-nums">240</span>
    </span>

    <Pipe />

    <span
      className="px-0.5 font-mono tabular-nums font-medium text-foreground"
      title="Results shown (placeholder)"
    >
      24
    </span>
  </div>
);

// Freeze this result set so the next run can be compared against it.
export const PinRunButton = () => (
  <button
    type="button"
    title="Pin this run to compare against the next one (placeholder)"
    className="hidden xl:grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/20 border border-border/50 shadow-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  >
    <Pin className="h-3.5 w-3.5" />
  </button>
);
