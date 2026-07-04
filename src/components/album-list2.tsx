import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Folder, Calendar, Pencil, Trash2, Check } from "lucide-react";
import { useGridStore, useConfigStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import type { AlbumView } from "@/lib/types";

interface AlbumList2Props {
  searchQuery: string;
  onLoadWorkspace: (workspaceName: string) => Promise<void>;
  actionLoading: string | null;
  setView: (view: 'list' | 'create') => void;
}

const AlbumList2: React.FC<AlbumList2Props> = ({
  searchQuery,
  onLoadWorkspace,
  actionLoading,
  setView,
}) => {
  const workspaces = useConfigStore((s) => s.workspaces);
  const setWorkspaces = useConfigStore((s) => s.setWorkspaces);

  // Inline edit state
  const [editingWorkspaceName, setEditingWorkspaceName] = useState<string | null>(null);
  const [editDescText, setEditDescText] = useState("");

  // Inline delete confirmation state
  const [confirmDeleteWorkspaceName, setConfirmDeleteWorkspaceName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleStartEdit = (album: AlbumView) => {
    setEditingWorkspaceName(album.name);
    setEditDescText(album.description);
  };

  const handleCancelEdit = () => {
    setEditingWorkspaceName(null);
    setEditDescText("");
  };

  const handleSaveEdit = async (workspaceName: string) => {
    try {
      await invoke("add_album_description", {
        albumName: workspaceName,
        description: editDescText,
      });

      const updated = workspaces.map((album) => {
        if (album.name === workspaceName) {
          return { ...album, description: editDescText };
        }
        return album;
      });
      setWorkspaces(updated);
      setEditingWorkspaceName(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save description: " + e);
    }
  };

  const handleDeleteWorkspace = async (workspaceName: string) => {
    setDeleteLoading(workspaceName);
    try {
      await invoke("delete_workspace", {
        albumName: workspaceName,
      });

      const updated = workspaces.filter((album) => album.name !== workspaceName);
      setWorkspaces(updated);
      setConfirmDeleteWorkspaceName(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete workspace: " + e);
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredWorkspaces = workspaces.filter((album) => {
    const query = searchQuery.toLowerCase();
    const dateStr = album.date
      ? new Date(album.date.secs_since_epoch * 1000).toLocaleDateString()
      : "";
    return (
      album.name.toLowerCase().includes(query) ||
      album.description.toLowerCase().includes(query) ||
      album.path.toLowerCase().includes(query) ||
      dateStr.includes(query)
    );
  });

  return (
    <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
      {filteredWorkspaces.length > 0 ? (
        filteredWorkspaces.map((album) => {
          const dateStr = album.date
            ? new Date(album.date.secs_since_epoch * 1000).toLocaleDateString()
            : "Unknown date";
          return (
            <div
              key={album.name}
              className="p-4 rounded-xl border border-border bg-card/45 hover:bg-accent/15 transition-all duration-200 flex flex-col gap-2 relative group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Workspace Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <Folder className="h-5 w-5 text-primary/70 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-base text-foreground truncate block">
                      {album.name}
                    </span>
                    <span className="text-xs text-muted-foreground/75 truncate block font-mono" title={album.path}>
                      {album.path}
                    </span>
                  </div>
                </div>

                {/* Primary Row Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                    onClick={() => onLoadWorkspace(album.name)}
                    disabled={actionLoading !== null || deleteLoading !== null}
                  >
                    {actionLoading === album.name ? "Loading..." : "Load"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => handleStartEdit(album)}
                    disabled={actionLoading !== null || deleteLoading !== null}
                    title="Edit Description"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setConfirmDeleteWorkspaceName(album.name)}
                    disabled={actionLoading !== null || deleteLoading !== null}
                    title="Delete Workspace"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Description Block */}
              {editingWorkspaceName === album.name ? (
                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    value={editDescText}
                    onChange={(e) => setEditDescText(e.target.value)}
                    placeholder="Enter description..."
                    className="w-full text-xs p-2 rounded border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs px-2.5 gap-1" onClick={() => handleSaveEdit(album.name)}>
                      <Check className="h-3 w-3" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 pr-2 line-clamp-2" title={album.description}>
                  {album.description || "No description provided."}
                </p>
              )}

              {/* Footer Info (Created date) */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-1 select-none">
                <Calendar className="h-3 w-3" />
                <span>Created: {dateStr}</span>
              </div>

              {/* Inline Delete Confirmation Overlay */}
              {confirmDeleteWorkspaceName === album.name && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-xs rounded-xl flex items-center justify-between px-6 z-25 border border-destructive/20">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-destructive">Delete workspace?</p>
                    <p className="text-xs text-muted-foreground">This removes the DB file. This cannot be undone.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirmDeleteWorkspaceName(null)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleDeleteWorkspace(album.name)}>
                      Confirm
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
          <p className="text-xs text-muted-foreground">No workspaces found matching "{searchQuery}"</p>
          {searchQuery === "" && (
            <Button variant="link" className="text-xs mt-2" onClick={() => setView('create')}>
              Create your first workspace
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AlbumList2;
