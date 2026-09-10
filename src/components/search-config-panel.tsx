import { Button } from "@/components/ui/button";
import { useSearchModeStore, SearchWay } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

// Shared shell for the h-10 chips that make up the search row — the config
// panel, the search bar, and the settings/progress chips beside it. Callers add
// their own display, gap and padding.
export const chipShell =
  "h-10 items-center rounded-xl bg-muted/20 border border-border/50 shadow-xs";

// Shared look for the small caps labels that head a group of options
export const sectionLabel =
  "text-[9px] uppercase tracking-wider text-muted-foreground/80 select-none";

// Map SearchWay enum values to whether the backend supports them yet
const searchWayEnabled: Record<SearchWay, boolean> = {
  [SearchWay.Semantic]: true,
  [SearchWay.Filename]: false,
  [SearchWay.SemanticFilename]: false,
};

// Shared look for the small option buttons in the search rows
export const optionClass = (active: boolean, disabled: boolean) =>
  `h-6 shrink-0 px-2 rounded-lg border text-[11px] leading-none transition-colors ${disabled
    ? "bg-background/20 text-muted-foreground/40 border-border/30 cursor-not-allowed"
    : active
      ? "bg-primary text-primary-foreground border-primary cursor-pointer"
      : "bg-background/40 text-muted-foreground border-border/50 hover:text-foreground hover:border-border cursor-pointer"
  }`;

const SearchConfigPanel = ({ onBack }: { onBack: () => void }) => {
  const searchWay = useSearchModeStore((s) => s.searchWay);
  const setSearchWay = useSearchModeStore((s) => s.setSearchWay);

  return (
    <div className={cn(chipShell, "flex gap-1.5 px-1.5")}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
        title="Back to search"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="h-4 w-px bg-border" />

      <span className={sectionLabel}>Search by:</span>

      {Object.values(SearchWay).map((way) => (
        <button
          key={way}
          type="button"
          disabled={!searchWayEnabled[way]}
          title={searchWayEnabled[way] ? undefined : "Not implemented yet"}
          onClick={() => setSearchWay(way)}
          className={optionClass(searchWay === way, !searchWayEnabled[way])}
        >
          {way}
        </button>
      ))}
    </div>
  );
};

export default SearchConfigPanel;
