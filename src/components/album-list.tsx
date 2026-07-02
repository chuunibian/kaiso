import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGridStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import { Calendar, Image, Search, ArrowRight } from "lucide-react";

// TODO Revamp this template file 
// This component is the list of albums

interface MockAlbum {
    name: string;
    created: string;
    imageCount: number;
    description: string;
}

const mockAlbums: MockAlbum[] = [
    {
        name: "vacation_2025",
        created: "2025-06-15",
        imageCount: 342,
        description: "Photos from summer trip to Hawaii and Oahu beaches.",
    },
    {
        name: "family_portraits",
        created: "2025-12-24",
        imageCount: 54,
        description: "Christmas family gathering and portrait shoots.",
    },
    {
        name: "street_photography",
        created: "2026-03-10",
        imageCount: 189,
        description: "Black and white street snaps around Tokyo and Shibuya.",
    },
    {
        name: "nature_walks",
        created: "2026-05-01",
        imageCount: 76,
        description: "Macro photography of flora and fauna in local reserves.",
    },
];

const AlbumList = () => {
    const setAlbumScreenOpen = useGridStore((s) => s.setAlbumScreenOpen);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleLoadAlbum = async (albumName: string) => {
        setIsLoading(albumName);
        try {
            await invoke<string>("load_workspace", {
                albumName: albumName,
            });
            console.log("Album Loaded:", albumName);
            setAlbumScreenOpen(false);
        } catch (e) {
            console.error("Failed to load album:", e);
        } finally {
            setIsLoading(null);
        }
    };

    const filteredAlbums = mockAlbums.filter((album) => {
        const query = searchQuery.toLowerCase();
        return (
            album.name.toLowerCase().includes(query) ||
            album.created.includes(query)
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
                    placeholder="Search albums by name or date..."
                    className="pl-9 h-9"
                />
            </div>

            {/* Album List Container */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredAlbums.length > 0 ? (
                    filteredAlbums.map((album) => (
                        <div
                            key={album.name}
                            onClick={() => !isLoading && handleLoadAlbum(album.name)}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-accent-foreground/20 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="space-y-1 flex-1 mr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                        {album.name}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        <Image className="h-3 w-3" />
                                        <span>{album.imageCount} files</span>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    {album.description}
                                </p>

                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                                    <Calendar className="h-3 w-3" />
                                    <span>Created: {album.created}</span>
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
                                className="h-8 gap-1 text-xs opacity-80 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200"
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
                    ))
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