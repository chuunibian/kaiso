import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { useGridStore, useConfigStore } from "@/lib/store";
import type { ImageOrder } from "@/lib/types";

import { 
  FolderKanban, 
  Search, 
  SlidersHorizontal, 
  Settings2, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  ZoomIn, 
  ZoomOut 
} from "lucide-react";

// WorkspaceSlot Component (Compact trigger and metadata label)
const WorkspaceSlot = () => {
  const setAlbumScreenOpen = useGridStore((s) => s.setAlbumScreenOpen);
  const currentWorkspace = useConfigStore((s) => s.currentWorkspace);
  const workspaces = useConfigStore((s) => s.workspaces);

  // Find info about the currently loaded workspace
  const workspaceInfo = workspaces.find((w) => w.name === currentWorkspace);

  // Format sync date
  const dateStr = workspaceInfo?.date
    ? new Date(workspaceInfo.date.secs_since_epoch * 1000).toLocaleDateString()
    : "Not loaded";

  // Clean path representation
  const pathStr = workspaceInfo?.path || "No path resolved";

  return (
    <div className="flex items-center gap-2 max-w-sm">
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setAlbumScreenOpen(true)}
        className="h-8 w-8 bg-muted hover:bg-muted/80 text-foreground cursor-pointer shrink-0"
        title="Workspace Manager"
      >
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
      </Button>
      <div className="flex flex-col text-[10px] leading-tight text-muted-foreground select-none min-w-0 flex-1">
        <span className="font-semibold text-foreground truncate max-w-48" title={currentWorkspace}>
          current: {currentWorkspace}
        </span>
        <span className="truncate text-muted-foreground/80" title={`${pathStr} | synced: ${dateStr}`}>
          path: {pathStr} | synced: {dateStr}
        </span>
      </div>
    </div>
  );
};

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
    <div className="flex items-center gap-2 w-full max-w-md">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Search images..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      <Button size="sm" onClick={onSearch} className="h-8 text-xs px-3">
        Search
      </Button>
    </div>
  );
};

// SearchMods Component (Mock options for search tweaks)
const SearchMods = () => {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" title="Adjust Search settings">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" title="Search Mode">
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

// FilterWrapper Component (Mock sorting and filtering elements)
const FilterWrapper = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border/65 bg-muted/10 px-2 py-0.5 rounded">
      <span className="font-medium text-[9px] uppercase tracking-wider text-muted-foreground/80 select-none">Sort:</span>
      <select className="bg-transparent border-0 text-foreground text-xs focus:outline-none cursor-pointer">
        <option>Confidence Score</option>
        <option>Date Modified</option>
        <option>File Name</option>
      </select>
      <div className="h-3 w-px bg-border" />
      <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted cursor-pointer" title="Toggle Sort Order">
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ViewsWrapper Component (Zoom slider & layout format toggles)
const ViewsWrapper = () => {
  return (
    <div className="flex items-center gap-3">
      {/* Grid vs List Toggles */}
      <div className="flex items-center border border-border/60 bg-muted/10 p-0.5 rounded">
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 bg-background text-foreground shadow-xs" title="Grid View">
          <LayoutGrid className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" title="List View">
          <List className="h-3 w-3" />
        </Button>
      </div>

      {/* Zooms Slider */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ZoomOut className="h-3.5 w-3.5" />
        <input
          type="range"
          min="1"
          max="5"
          defaultValue="3"
          className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
          title="Zoom Grid"
        />
        <ZoomIn className="h-3.5 w-3.5" />
      </div>
    </div>
  );
};

const TopBar = () => {
  const [userQuery, setUserQuery] = useState<string>("");

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
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <Card className="rounded-none border-x-0 border-t-0 shrink-0">
      <CardContent className="flex flex-col gap-1.5 pt-1.5 pb-2 px-3">
        {/* Row 1: Search bar and adjustments */}
        <div className="flex flex-row items-center justify-between gap-4 w-full">
          <SearchBar userQuery={userQuery} setUserQuery={setUserQuery} onSearch={testQuery} />
          <SearchMods />
        </div>
        
        {/* Row 2: Workspace details, filtering, zooms layout */}
        <div className="flex flex-row items-center justify-between gap-4 w-full pt-1">
          <WorkspaceSlot />
          <div className="flex items-center gap-4">
            <FilterWrapper />
            <ViewsWrapper />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopBar;
