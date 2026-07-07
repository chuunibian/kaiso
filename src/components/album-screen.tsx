import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Plus, RotateCw } from "lucide-react";
import CustomPath from "./folderclicker";
import AlbumList2 from "./album-list2";
import { useGridStore, useConfigStore, useFrontendProgressStore } from "@/lib/store";
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
        }

        // Done indexing — switch from progress screen to grid
        setIsIndexing(false);

        // clean up listners after promise comes back
        unlisten1();
        unlisten2();
      })
      .catch((e) => {
        console.error(e);
        setIsIndexing(false);

        alert("Failed to create workspace: " + e);

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
      }

      setWorkspace(workspaceName);
      setAlbumScreenOpen(false);
    } catch (e) {
      console.error("Failed to load workspace:", e);
      alert("Failed to load workspace: " + e);
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Card className="w-full max-w-2xl mx-4 p-6 shadow-2xl relative border bg-card">
        {/* Exit Button */}
        <button
          onClick={() => setAlbumScreenOpen(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors z-20"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title Bar with controls */}
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-bold text-foreground">
              Workspaces
            </CardTitle>
            <p className="text-xs text-muted-foreground">Manage and switch your indexed folder workspaces.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
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
              className="h-8 gap-1 text-xs text-muted-foreground/60"
              disabled
              title="Sync (Coming soon)"
            >
              <RotateCw className="h-3.5 w-3.5" /> Sync
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, path or description..."
            className="pl-9 h-9 text-xs"
            disabled={actionLoading !== null}
          />
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