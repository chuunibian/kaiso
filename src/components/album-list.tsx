import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGridStore, useConfigStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import { Calendar, Search, ArrowRight, Folder } from "lucide-react";
import type { AlbumView, ImageOrder } from "@/lib/types";

// Drilled-down props from the parent AlbumScreen component
interface AlbumListProps {
    setCurrentWorkspace: (workspace: string) => void;
    setAlbumScreenOpen: (open: boolean) => void;
}

const AlbumList: React.FC<AlbumListProps> = ({
    setCurrentWorkspace,
    setAlbumScreenOpen,
}) => {
    const workspaces = useConfigStore((s) => s.workspaces);
    const setWorkspaces = useConfigStore((s) => s.setWorkspaces);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const clearCache = useGridStore((s) => s.resetCache);

    // Fetch workspaces inside the actual album-list component on startup (mount)
    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const data = await invoke<AlbumView[]>("find_workspaces");
                setWorkspaces(data);
            } catch (e) {
                console.error("Failed to find workspaces:", e);
            }
        };
        fetchWorkspaces();
    }, [setWorkspaces]);

    const handleLoadAlbum = async (albumName: string) => {
        setIsLoading(albumName);
        try {
            // 1. Invoke backend load_workspace
            await invoke<string>("load_workspace", {
                albumName: albumName,
            });

            // const result = await invoke<ImageOrder[]>("get_image_ids");
            console.log("Album Loaded");
            clearCache(); // Temp maybe

            const result = await invoke<ImageOrder[]>("get_default_ids");

            // 3. Populate grid store cache
            useGridStore.getState().changeOrderedIds(result);

            // 4. Update parent states and close screen
            setCurrentWorkspace(albumName);
            setAlbumScreenOpen(false);
        } catch (e) {
            console.error("Failed to load album:", e);
        } finally {
            setIsLoading(null);
        }
    };

    const filteredAlbums = workspaces.filter((album) => {
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
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search albums by name, description, or date..."
                    className="pl-9 h-9 text-xs"
                />
            </div>

            {/* Album List Container
                map transform multi div like a list 
            */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredAlbums.length > 0 ? (
                    filteredAlbums.map((album) => {
                        const dateStr = album.date
                            ? new Date(album.date.secs_since_epoch * 1000).toLocaleDateString()
                            : "Unknown date";
                        return (
                            <div
                                key={album.name}
                                onClick={() => !isLoading && handleLoadAlbum(album.name)}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-accent-foreground/20 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="space-y-1 flex-1 mr-4 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-xs">
                                            {album.name}
                                        </span>
                                    </div>

                                    {album.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {album.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span>Created: {dateStr}</span>
                                        </div>
                                        <div className="flex items-center gap-1 truncate max-w-xs">
                                            <Folder className="h-3 w-3 shrink-0" />
                                            <span className="truncate text-muted-foreground/60" title={album.path}>{album.path}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoading !== null}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLoadAlbum(album.name);
                                    }}
                                    className="h-8 gap-1 text-xs opacity-80 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shrink-0"
                                >
                                    {isLoading === album.name ? (
                                        "Loading..."
                                    ) : (
                                        <>
                                            <span>Load</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-foreground" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-xs text-muted-foreground">No albums found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlbumList;