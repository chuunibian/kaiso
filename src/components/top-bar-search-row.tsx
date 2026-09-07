// Top section of the TopBar — search query input and search adjustments.
import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGridStore, handleBackendError } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ImageOrder } from "@/lib/types";
import SearchConfigPanel, {
  ConfigBadges,
  defaultSearchConfig,
  isDefaultConfig,
  type SearchConfig,
} from "./search-config-panel";

import { ScanSearch, SlidersHorizontal, Settings2, X, ArrowRight } from "lucide-react";
import { SearchScopePill, SearchRunReadout, PinRunButton } from "./search-run-strip";

// MOCK: pipeline stages, rendered as dots straddling the search bar's bottom
// border. Placeholder until the reranking stages are real.
const SEARCH_STAGES = [
  { id: "embed", label: "Query embedding", color: "bg-chart-1" },
  { id: "retrieve", label: "Vector retrieval", color: "bg-chart-2" },
  { id: "rerank", label: "CLIP rerank", color: "bg-chart-3" },
  { id: "fuse", label: "BLIP rerank", color: "bg-chart-5" },
];

const StageDots = () => (
  <div className="absolute right-14 bottom-0 translate-y-1/2 flex items-center gap-2 z-10">
    {SEARCH_STAGES.map((stage, i) => (
      <span
        key={stage.id}
        title={stage.label}
        className={cn("h-2 w-2 rounded-full ring-1 ring-background/70", stage.color)}
        // only the final stage blinks; the earlier ones sit solid
        style={
          i === SEARCH_STAGES.length - 1
            ? { animation: "stage-dot-blink 1.2s ease-in-out infinite" }
            : undefined
        }
      />
    ))}
  </div>
);

// SearchBar Component — one pill holding the input and an embedded search button.
// Enter submits (it's a real form), Escape clears.
const SearchBar = ({
  userQuery,
  setUserQuery,
  onSearch,
  isSearching,
  onOpenConfig,
  config,
}: {
  userQuery: string;
  setUserQuery: (val: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  onOpenConfig: () => void;
  config: SearchConfig;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div
        className="group/search relative flex h-10 items-center gap-1.5 pl-2 pr-1 rounded-xl bg-muted/20 border border-border/50 shadow-xs transition-colors focus-within:border-ring/60 focus-within:bg-muted/30"
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
          {!isDefaultConfig(config) && (
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>

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
          <button
            type="button"
            title="Clear (Esc)"
            onClick={() => {
              setUserQuery("");
              inputRef.current?.focus();
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* What this search is configured to do, right before the submit */}
        <ConfigBadges config={config} />

        {/* Embedded submit — sits inside the pill, not beside it */}
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

        <StageDots />
      </div>
    </form>
  );
};

// SearchMods Component (Mock options for search tweaks)
const SearchMods = () => {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" title="Adjust Search settings">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" title="Search Mode">
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const TopBarSearchRow = () => {
  const [userQuery, setUserQuery] = useState<string>("");
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(defaultSearchConfig);
  const isSearching = useGridStore((s) => s.isSearching);

  const runSearch = async () => {
    const setIsSearching = useGridStore.getState().setIsSearching;
    setIsSearching(true);
    try {
      const result = await invoke<ImageOrder[]>("process_query", {
        userQuery: userQuery,
      });
      console.log("Result: ", result);
      useGridStore.getState().changeOrderedIds(result);
    } catch (e) {
      console.log(e);
      handleBackendError(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full min-w-0">
      {/* The config strip drops the width cap so its options fit on one line */}
      <div className={cn("flex-1 min-w-0", !configOpen && "max-w-3xl")}>
        {configOpen ? (
          <SearchConfigPanel
            config={searchConfig}
            setConfig={setSearchConfig}
            onBack={() => setConfigOpen(false)}
          />
        ) : (
          <SearchBar
            userQuery={userQuery}
            setUserQuery={setUserQuery}
            onSearch={runSearch}
            isSearching={isSearching}
            onOpenConfig={() => setConfigOpen(true)}
            config={searchConfig}
          />
        )}
      </div>
      {/* MOCK: right-side run context — see search-run-strip.tsx */}
      {!configOpen && (
        <div className="flex items-center gap-1.5 shrink-0">
          <SearchScopePill />
          <SearchRunReadout />
          <PinRunButton />
        </div>
      )}
      <div className="ml-auto">
        <SearchMods />
      </div>
    </div>
  );
};

export default TopBarSearchRow;
