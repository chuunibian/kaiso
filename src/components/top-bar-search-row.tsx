// Top section of the TopBar — search query input and search adjustments.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Spinner } from "@/components/ui/spinner";
import {
  useGridStore,
  useSearchModeStore,
  handleBackendError,
  SearchMode,
  SearchStage,
  SearchWay,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ImageOrder, Progress } from "@/lib/types";
import SearchConfigPanel, {
  chipShell,
  optionClass,
  sectionLabel,
} from "./search-config-panel";
import { ScanSearch, X, ArrowRight } from "lucide-react";

// The running stage blinks, both on the bar under the search pill and in the
// progress chip beside it.
const blink = { animation: "stage-bar-blink 1.2s ease-in-out infinite" };

// Pipeline stages for the active mode, rendered as equal-length segments
// straddling the search bar's bottom border. The running one blinks.
const stagesFor = (mode: SearchMode) =>
  mode === SearchMode.ClipBlip
    ? [
      { stage: SearchStage.Clip, label: "CLIP retrieval", color: "bg-chart-1" },
      { stage: SearchStage.Blip, label: "BLIP rerank", color: "bg-chart-5" },
    ]
    : [{ stage: SearchStage.Clip, label: "CLIP retrieval", color: "bg-chart-1" }];

const StageBar = ({ mode, current }: { mode: SearchMode; current: SearchStage }) => (
  <div className="absolute right-14 bottom-0 translate-y-1/2 flex items-center gap-1 z-10">
    {stagesFor(mode).map((s) => (
      <span
        key={s.stage}
        title={s.label}
        className={cn(
          "h-1.5 w-6 rounded-full ring-1 ring-background/70",
          s.color,
          current === SearchStage.Idle && "opacity-25"
        )}
        style={current === s.stage ? blink : undefined}
      />
    ))}
  </div>
);

// Map SearchMode enum values to their rerank label
const rerankLabels: Record<SearchMode, string> = {
  [SearchMode.Clip]: "None",
  [SearchMode.ClipBlip]: "BLIP",
};

// mock clip enhancements 
const ENHANCEMENTS = ["X", "Y", "Z"];

// SemanticSettings Component — settings for the Semantic search way, wired to
// searchMode and rerankTopN from store
const SemanticSettings = () => {
  const searchMode = useSearchModeStore((s) => s.searchMode);
  const setSearchMode = useSearchModeStore((s) => s.setSearchMode);
  const rerankTopN = useSearchModeStore((s) => s.rerankTopN);
  const setRerankTopN = useSearchModeStore((s) => s.setRerankTopN);
  // local draft so the field can sit empty mid-edit, the store only takes valid values
  const [topNDraft, setTopNDraft] = useState<string>(String(rerankTopN));

  return (
    <div className={cn(chipShell, "hidden lg:flex shrink-0 gap-1.5 px-2")}>
      <span className={sectionLabel}>Rerank:</span>
      {Object.values(SearchMode).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setSearchMode(mode)}
          className={optionClass(searchMode === mode, false)}
        >
          {rerankLabels[mode]}
        </button>
      ))}

      {searchMode === SearchMode.ClipBlip && (
        <input
          type="number"
          min={1}
          max={999}
          value={topNDraft}
          title="Rerank top N"
          onChange={(e) => {
            setTopNDraft(e.target.value);
            if (e.target.value !== "") setRerankTopN(Number(e.target.value));
          }}
          onBlur={() => setTopNDraft(String(useSearchModeStore.getState().rerankTopN))}
          className="h-6 w-12 rounded-lg border border-border/50 bg-background/40 px-1.5 text-[11px] text-muted-foreground outline-none focus:text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      )}

      <div className="h-4 w-px bg-border" />

      <span className={sectionLabel}>Enhance:</span>
      {ENHANCEMENTS.map((name) => (
        <button
          key={name}
          type="button"
          disabled
          title="Not implemented yet"
          className={optionClass(false, true)}
        >
          {name}
        </button>
      ))}
    </div>
  );
};

// Segmented run progress: one segment per stage, the running one blinks and
// fills with the count the backend emits.
const SearchProgress = () => {
  const searchMode = useSearchModeStore((s) => s.searchMode);
  const searchStage = useSearchModeStore((s) => s.searchStage);
  const rerankDone = useSearchModeStore((s) => s.rerankDone);
  const rerankTotal = useSearchModeStore((s) => s.rerankTotal);

  const stages = stagesFor(searchMode);
  // the clip stage has no count to report, only blip fills its segment
  const blipActive = searchStage === SearchStage.Blip && rerankTotal > 0;
  const pct = blipActive ? Math.round((rerankDone / rerankTotal) * 100) : 0;

  return (
    <div className={cn(chipShell, "hidden md:flex shrink-0 gap-2 px-2.5")}>
      <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-border/60">
        {stages.map((s) => (
          <span
            key={s.stage}
            title={s.label}
            className={cn(
              "relative flex-1 border-r border-background/40 last:border-r-0",
              searchStage === SearchStage.Idle && "opacity-25"
            )}
          >
            <span
              className={cn("absolute inset-0", s.color)}
              style={
                searchStage === s.stage
                  ? { ...blink, clipPath: blipActive ? `inset(0 ${100 - pct}% 0 0)` : undefined }
                  : undefined
              }
            />
          </span>
        ))}
      </div>
      <span className="font-mono text-[11px] leading-none tabular-nums text-muted-foreground">
        {blipActive
          ? `${rerankDone}/${rerankTotal}`
          : searchStage === SearchStage.Clip
            ? "CLIP"
            : "idle"}
      </span>
    </div>
  );
};

// Small label badge — marks each half of a split search bar, and tags the bar
// with the active search way
const HalfBadge = ({ label, className }: { label: string; className?: string }) => (
  <span
    className={cn(
      "shrink-0 h-5 px-1.5 rounded-md border border-border/60 bg-background/40 text-[10px] leading-5 tracking-wide text-muted-foreground select-none",
      className
    )}
  >
    {label}
  </span>
);

// Clears the field it sits in — one per half of a split search bar
const ClearButton = ({ onClear }: { onClear: (e: MouseEvent<HTMLButtonElement>) => void }) => (
  <button
    type="button"
    title="Clear (Esc)"
    onClick={onClear}
    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
  >
    <X className="h-4 w-4" />
  </button>
);

// SearchBar Component one pill holding the input and an embedded search button.
// With the blip reranker on it splits in half, the second half being the refine
// query handed to the reranker.
// Enter submits (it's a real form), Escape clears.
const SearchBar = ({
  userQuery,
  setUserQuery,
  refineQuery,
  setRefineQuery,
  onSearch,
  isSearching,
  onOpenConfig,
}: {
  userQuery: string;
  setUserQuery: (val: string) => void;
  refineQuery: string;
  setRefineQuery: (val: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  onOpenConfig: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWay = useSearchModeStore((s) => s.searchWay);
  const searchMode = useSearchModeStore((s) => s.searchMode);
  const searchStage = useSearchModeStore((s) => s.searchStage);
  const isSplit = searchMode === SearchMode.ClipBlip;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div
        className={cn(
          chipShell,
          "group/search relative flex gap-1.5 pl-2 pr-1",
          "transition-colors focus-within:border-ring/60 focus-within:bg-muted/30"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Magnifier doubles as the entry point to the search configuration */}
        <button
          type="button"
          title="Search configuration"
          onClick={(e) => {
            e.stopPropagation();
            onOpenConfig();
          }}
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ScanSearch className="h-[18px] w-[18px]" />
          {searchWay !== SearchWay.Semantic && (
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>

        {isSplit && <HalfBadge label="CLIP" />}

        <input
          ref={inputRef}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (userQuery) setUserQuery("");
              else inputRef.current?.blur();
            }
          }}
          placeholder="Search images..."
          spellCheck={false}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />

        {/* Clear — only present once there is something to clear */}
        {userQuery && (
          <ClearButton
            onClear={() => {
              setUserQuery("");
              inputRef.current?.focus();
            }}
          />
        )}

        {/* Second half — the blip refine query, mirrors the clip one until edited */}
        {isSplit && (
          <>
            <div className="h-5 w-px shrink-0 bg-border" />

            <HalfBadge label="Rerank" />

            <input
              value={refineQuery}
              onChange={(e) => setRefineQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setRefineQuery("");
              }}
              placeholder="Refine for the reranker..."
              spellCheck={false}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />

            {refineQuery && (
              <ClearButton
                onClear={(e) => {
                  e.stopPropagation();
                  setRefineQuery("");
                }}
              />
            )}
          </>
        )}

        <HalfBadge label={searchWay} className="hidden md:block" />

        <button
          type="submit"
          title="Search (Enter)"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            "bg-primary text-primary-foreground hover:bg-primary/80",
            "transition-colors cursor-pointer active:translate-y-px"
          )}
        >
          {isSearching ? (
            <Spinner className="size-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>

        <StageBar mode={searchMode} current={searchStage} />
      </div>
    </form>
  );
};

const TopBarSearchRow = () => {
  const [userQuery, setUserQuery] = useState<string>("");
  const [refineQuery, setRefineQuery] = useState<string>("");
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const isSearching = useGridStore((s) => s.isSearching);
  const searchMode = useSearchModeStore((s) => s.searchMode);

  useEffect(() => {
    const unlisten = listen<Progress>("blip-progress", (e) => {
      useSearchModeStore.getState().setRerankProgress(e.payload.done, e.payload.total);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const runSearch = async () => {
    const setIsSearching = useGridStore.getState().setIsSearching;
    const { searchMode, rerankTopN, setSearchStage } = useSearchModeStore.getState();
    setIsSearching(true);
    setSearchStage(SearchStage.Clip);
    useSearchModeStore.getState().setRerankProgress(0, 0);
    try {
      const result = await invoke<ImageOrder[]>("process_query", {
        userQuery: userQuery,
      });
      // show the clip ordering first, the rerank only reshuffles its head after
      useGridStore.getState().changeOrderedIds(result);

      if (searchMode === SearchMode.ClipBlip && result.length > 0) {
        setSearchStage(SearchStage.Blip);
        const window = result.slice(0, rerankTopN);
        const reranked = await invoke<ImageOrder[]>("hybrid_process_query_decoupled", {
          rerankingQuery: refineQuery || userQuery,
          rerankPairs: window,
        });
        // new array so the grid sees a ref change, tail past the window is untouched
        useGridStore
          .getState()
          .changeOrderedIds([...reranked, ...result.slice(window.length)]);
      }
    } catch (e) {
      console.log(e);
      handleBackendError(e);
    } finally {
      setSearchStage(SearchStage.Idle);
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full min-w-0">
      {/* The config strip drops the width cap so its options fit on one line */}
      <div
        className={cn(
          "flex-1 min-w-0",
          !configOpen && (searchMode === SearchMode.ClipBlip ? "max-w-5xl" : "max-w-3xl")
        )}
      >
        {configOpen ? (
          <SearchConfigPanel onBack={() => setConfigOpen(false)} />
        ) : (
          <SearchBar
            userQuery={userQuery}
            setUserQuery={setUserQuery}
            refineQuery={refineQuery}
            setRefineQuery={setRefineQuery}
            onSearch={runSearch}
            isSearching={isSearching}
            onOpenConfig={() => setConfigOpen(true)}
          />
        )}
      </div>
      {!configOpen && (
        <div className="flex items-center gap-1.5 shrink-0">
          <SemanticSettings />
          <SearchProgress />
        </div>
      )}
    </div>
  );
};

export default TopBarSearchRow;
