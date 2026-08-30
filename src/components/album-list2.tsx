import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Circle, Calendar, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { useGridStore, useConfigStore, handleBackendError } from "@/lib/store";
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
      handleBackendError(e);
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
      handleBackendError(e);
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
    <div className="max-h-[520px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
      {filteredWorkspaces.length > 0 ? (
        filteredWorkspaces.map((album) => {
          const dateStr = album.date
            ? new Date(album.date.secs_since_epoch * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Unknown";
          return (
            <div
              key={album.name}
              className="p-5 rounded-2xl border border-border bg-muted/40 hover:border-[oklch(0.70_0.12_15)] transition-all duration-200 flex flex-col gap-2.5 relative group"
            >
              {/* Header: Name + Path + Actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-base text-foreground block">
                    {album.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground/65 truncate block font-mono mt-0.5" title={album.path}>
                    {album.path}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-foreground hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                    onClick={() => onLoadWorkspace(album.name)}
                    disabled={actionLoading !== null || deleteLoading !== null}
                    title="Load Workspace"
                  >
                    {actionLoading === album.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
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

              {/* Description Block — wraps fully, clamp at ~4 lines */}
              {editingWorkspaceName === album.name ? (
                <div className="flex flex-col gap-2 mt-0.5">
                  <textarea
                    value={editDescText}
                    onChange={(e) => setEditDescText(e.target.value)}
                    placeholder="Enter description..."
                    className="w-full text-xs p-2.5 rounded-lg border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary min-h-[72px] resize-none"
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
                <p className="text-sm text-foreground/70 leading-relaxed mt-0.5 break-words overflow-hidden line-clamp-6">
                  {album.description || "No description provided."}
                </p>
              )}

              {/* Created Date Badge — bottom-right corner */}
              <div className="flex items-center justify-end mt-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground bg-muted/50 border border-border/40 rounded-md px-2.5 py-1 select-none">
                  <Calendar className="h-3.5 w-3.5" />
                  {dateStr}
                </span>
              </div>

              {/* Inline Delete Confirmation Overlay */}
              {confirmDeleteWorkspaceName === album.name && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-xs rounded-2xl flex items-center justify-between px-6 z-25 border border-destructive/20">
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
        <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl bg-muted/5">
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
