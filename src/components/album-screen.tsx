import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Plus, RotateCw } from "lucide-react";
import CustomPath from "./folderclicker";
import AlbumList2 from "./album-list2";
import { useGridStore, useConfigStore, useFrontendProgressStore, handleBackendError } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import type { ImageOrder, AlbumView, Progress } from "@/lib/types";
import { listen } from "@tauri-apps/api/event";

const AlbumScreen = () => {
  const setAlbumScreenOpen = useGridStore((s) => s.setAlbumScreenOpen);
  const setWorkspace = useConfigStore((s) => s.setCurrentWorkspace);
  const setWorkspaces = useConfigStore((s) => s.setWorkspaces);
  const clearCache = useGridStore((s) => s.resetCache);

  const [view, setView] = useState<'list' | 'create'>('list');
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [albumName, setAlbumName] = useState<string>("");
  const [albumDescription, setAlbumDescription] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      const data = await invoke<AlbumView[]>("find_workspaces");
      setWorkspaces(data);
    } catch (e) {
      console.error("Failed to find workspaces:", e);
      handleBackendError(e);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async () => {
    if (!albumName.trim() || !selectedPath.trim()) return;

    const setIsIndexing = useConfigStore.getState().setIsIndexing;

    // switch to the progress/indexing screen
    setWorkspace(albumName);
    setIsIndexing(true); // force loading screen 
    setAlbumScreenOpen(false);

    // set up listeners before invoking create_workspace, these listeners listen for msg from BE
    // store to global store and force dynamic updates in the progress screen
    const unlisten1 = await listen<string>("create-workspace", (event) => {
      useFrontendProgressStore.getState().setTextStatus(event.payload);
    });
    const unlisten2 = await listen<Progress>("embed-progress", (event) => {
      useFrontendProgressStore.getState().setCount(event.payload.done);
      useFrontendProgressStore.getState().setTotal(event.payload.total);
    });

    // non-await but after promise returns set an async call back to do certain stuff
    invoke<string>('create_workspace', {
      target: selectedPath,
      albumName: albumName,
      albumDescription: albumDescription || "No description provided."
    })
      .then(async () => {
        // Workspace created + already loaded on backend
        clearCache();

        try {
          const result = await invoke<ImageOrder[]>("get_default_ids");
          useGridStore.getState().changeOrderedIds(result);
        } catch (err) {
          console.log("get_default_ids failed:", err);
          handleBackendError(err);
        }

        fetchWorkspaces();

        // Done indexing — switch from progress screen to grid
        setIsIndexing(false);

        // clean up listners after promise comes back
        unlisten1();
        unlisten2();
      })
      .catch((e) => {
        console.error(e);
        setIsIndexing(false);

        handleBackendError(e);

        unlisten1();
        unlisten2();
      });
  };

  const handleLoadWorkspace = async (workspaceName: string) => {
    setActionLoading(workspaceName);
    try {
      await invoke<string>("load_workspace", {
        albumName: workspaceName,
      });

      console.log("Workspace Loaded");
      clearCache();

      try {
        const ids = await invoke<ImageOrder[]>("get_default_ids");
        useGridStore.getState().changeOrderedIds(ids);
      } catch (err) {
        console.log("get_default_ids failed:", err);
        handleBackendError(err);
      }

      setWorkspace(workspaceName);
      setAlbumScreenOpen(false);
    } catch (e) {
      console.error("Failed to load workspace:", e);
      handleBackendError(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Render Create Workspace Form
  if (view === 'create') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        <Card className="w-full max-w-lg mx-4 p-6 shadow-2xl relative border bg-card">
          <button
            onClick={() => setAlbumScreenOpen(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors z-20"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              Create New Workspace
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Workspace Name:</span>
              <Input
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Enter workspace name..."
                className="h-9 text-xs"
                disabled={actionLoading !== null}
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Description:</span>
              <Input
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                placeholder="Enter workspace description..."
                className="h-9 text-xs"
                disabled={actionLoading !== null}
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Select Folder:</span>
              <CustomPath value={selectedPath} onChange={setSelectedPath} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setView('list')} disabled={actionLoading !== null}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateWorkspace} disabled={!albumName.trim() || !selectedPath.trim() || actionLoading !== null}>
                {actionLoading !== null ? "Creating..." : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render List view (Default)
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-full max-w-3xl mx-4 p-8 shadow-2xl relative rounded-3xl border border-border bg-card overflow-hidden">
        {/* Exit Button */}
        <button
          onClick={() => setAlbumScreenOpen(false)}
          className="absolute right-6 top-6 text-muted-foreground hover:text-foreground cursor-pointer transition-colors z-20"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Search bar + action buttons merged into one row */}
        <div className="flex items-center gap-2 mb-6 pr-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="pl-9 h-10 text-xs rounded-xl border-border bg-muted/30"
              disabled={actionLoading !== null}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-10 gap-1.5 text-xs rounded-xl shrink-0 px-4"
            onClick={() => {
              setAlbumName("");
              setAlbumDescription("");
              setSelectedPath("");
              setView('create');
            }}
            disabled={actionLoading !== null}
          >
            <Plus className="h-4 w-4" /> Create
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 gap-1.5 text-xs rounded-xl shrink-0 px-4 text-muted-foreground/60"
            disabled
            title="Sync (Coming soon)"
          >
            <RotateCw className="h-3.5 w-3.5" /> Sync
          </Button>
        </div>

        {/* Workspace List Container */}
        <CardContent className="p-0">
          <AlbumList2
            searchQuery={searchQuery}
            onLoadWorkspace={handleLoadWorkspace}
            actionLoading={actionLoading}
            setView={setView}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AlbumScreen;