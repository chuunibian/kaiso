import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { useGridStore, useConfigStore, useTopBarStateStore, useSelectedEntitiesStore, FilterStatus, FilterStatusDirection, handleBackendError } from "@/lib/store";
import { virtuosoGridRef } from "@/lib/grid-ref";
import type { ImageOrder } from "@/lib/types";

import {
  Search,
  SlidersHorizontal,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  ZoomIn,
  ZoomOut,
  PanelRight,
  PanelRightClose,
  ArrowUpToLine,
  ArrowDownToLine,
  MousePointerSquareDashed,
} from "lucide-react";

import WorkspaceInfoCard from "./current-workspace-infocard";

// SearchBar Component (Search query input and search button)
const SearchBar = ({
  userQuery,
  setUserQuery,
  onSearch,
}: {
  userQuery: string;
  setUserQuery: (val: string) => void;
  onSearch: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 w-full max-w-md min-w-0 flex-1">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Search images..."
          className="pl-8 h-8 text-xs w-full"
        />
      </div>
      <Button size="sm" onClick={onSearch} className="h-8 text-xs px-3 shrink-0">
        Search
      </Button>
    </div>
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

// Map FilterStatus enum values to display labels
const filterStatusLabels: Record<FilterStatus, string> = {
  [FilterStatus.Score]: "Confidence Score",
  [FilterStatus.Date]: "Date Modified",
  [FilterStatus.Size]: "File Size",
  [FilterStatus.Name]: "File Name",
};

// FilterWrapper Component — wired to filterStatus & filterStatusDirection from store
const FilterWrapper = () => {
  const filterStatus = useTopBarStateStore((s) => s.filterStatus);
  const filterStatusDirection = useTopBarStateStore((s) => s.filterStatusDirection);
  const setFilterStatus = useTopBarStateStore((s) => s.setFilterStatus);
  const setFilterStatusDirection = useTopBarStateStore((s) => s.setFilterStatusDirection);

  const toggleDirection = () => {
    setFilterStatusDirection(
      filterStatusDirection === FilterStatusDirection.Ascending
        ? FilterStatusDirection.Descending
        : FilterStatusDirection.Ascending
    );
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground border border-border/65 bg-muted/10 px-2 py-0.5 rounded shrink-0">
      <span className="hidden sm:inline font-medium text-[9px] uppercase tracking-wider text-muted-foreground/80 select-none">Sort:</span>
      <select
        className="bg-transparent border-0 text-foreground text-xs focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none truncate"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
      >
        {Object.values(FilterStatus).map((status) => (
          <option key={status} value={status}>
            {filterStatusLabels[status]}
          </option>
        ))}
      </select>
      <div className="h-3 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0 hover:bg-muted cursor-pointer shrink-0"
        title={`Sort: ${filterStatusDirection}`}
        onClick={toggleDirection}
      >
        {filterStatusDirection === FilterStatusDirection.Ascending ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};

// ViewsWrapper Component (Zoom slider & layout format toggles) — wired to gridSize from store
const ViewsWrapper = () => {
  const gridSize = useTopBarStateStore((s) => s.gridSize);
  const setGridSizeNumber = useTopBarStateStore((s) => s.setGridSizeNumber);
  const informationPanelFlag = useTopBarStateStore((s) => s.informationPanelFlag);
  const setInformationPanelFlag = useTopBarStateStore((s) => s.setInformationPanelFlag);

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
      {/* Grid vs List Toggles */}
      <div className="flex items-center border border-border/60 bg-muted/10 p-0.5 rounded shrink-0">
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 bg-background text-foreground shadow-xs" title="Grid View">
          <LayoutGrid className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" title="List View">
          <List className="h-3 w-3" />
        </Button>
      </div>

      {/* Zooms Slider — wired to gridSize store (range 1–9) */}
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <input
          type="range"
          min="1"
          max="9"
          value={gridSize}
          onChange={(e) => setGridSizeNumber(Number(e.target.value))}
          className="w-14 sm:w-24 range-slider"
          title={`Grid columns: ${gridSize}`}
        />
      </div>

      {/* Scroll to Top / Bottom */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Scroll to Top"
          onClick={() => virtuosoGridRef.current?.scrollToIndex({ index: 0, align: 'start' })}
        >
          <ArrowUpToLine className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Scroll to Bottom"
          onClick={() => {
            const total = useGridStore.getState().orderedIds.length;
            if (total > 0) virtuosoGridRef.current?.scrollToIndex({ index: total - 1, align: 'end' });
          }}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Info Panel Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 cursor-pointer shrink-0 ${informationPanelFlag ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"}`}
        title={informationPanelFlag ? "Hide Info Panel" : "Show Info Panel"}
        onClick={() => setInformationPanelFlag(!informationPanelFlag)}
      >
        {informationPanelFlag ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

const TopBar = () => {
  const [userQuery, setUserQuery] = useState<string>("");
  const multiSelectMode = useSelectedEntitiesStore((s) => s.multiSelectMode);
  const setMultiSelectMode = useSelectedEntitiesStore((s) => s.setMultiSelectMode);

  const testQuery = async () => {
    const setIsSearching = useGridStore.getState().setIsSearching;
    setIsSearching(true);
    try {
      const result = await invoke<ImageOrder[]>('process_query', {
        userQuery: userQuery
      });
      console.log("Result: ", result);
      useGridStore.getState().changeOrderedIds(result);
    } catch (e) {
      console.log(e);
      handleBackendError(e);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <Card className="rounded-none border-x-0 border-t-0 shrink-0 overflow-hidden">
      <CardContent className="flex flex-col gap-1.5 pt-1.5 pb-1 px-3 min-w-0">
        {/* Row 1: Search bar and adjustments */}
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          <SearchBar userQuery={userQuery} setUserQuery={setUserQuery} onSearch={testQuery} />
          <SearchMods />
        </div>

        {/* Row 2: Workspace details, filtering, zooms layout */}
        <div className="flex flex-row flex-nowrap items-center justify-between gap-2 sm:gap-4 w-full pt-1 min-w-0">
          <WorkspaceInfoCard />
          <div className="flex items-center gap-2 sm:gap-3 flex-nowrap ml-auto min-w-0 shrink-0">
            <FilterWrapper />
            {/* Multi-select toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 cursor-pointer shrink-0 transition-colors duration-150 ${
                multiSelectMode
                  ? "text-pink-400 bg-pink-500/15 hover:bg-pink-500/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={multiSelectMode ? "Exit multi-select" : "Multi-select"}
              onClick={() => setMultiSelectMode(!multiSelectMode)}
            >
              <MousePointerSquareDashed className="h-4 w-4" />
            </Button>
            <ViewsWrapper />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopBar;
