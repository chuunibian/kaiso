import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import CustomPath from "./folderclicker";
import AlbumList from "./album-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGridStore, useConfigStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";

const AlbumScreen = () => {
  const setAlbumScreenOpen = useGridStore((s) => s.setAlbumScreenOpen);
  const setWorkspace = useConfigStore((s) => s.setCurrentWorkspace);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [albumName, setAlbumName] = useState<string>("");
  const [loadText, setLoadText] = useState<string>("");

  // using this function to test an entrypoint call for the create workspace func
  const testFunction = async () => {
    try {
      const result = await invoke<string>('create_workspace', {
        target: selectedPath,
        albumName: albumName || "temp_test_album2"
      });
      console.log("Result:", result);
    } catch (e) {
      console.log(e);
    }
  }

  const testLoadAlbum = async () => {
    try {
      const result = await invoke<string>('load_workspace', {
        albumName: loadText
      });
      console.log("Album Loaded");
      setWorkspace(loadText);
      setAlbumScreenOpen(false); // Close overlay on success
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Card className="w-full max-w-lg mx-4 p-6 shadow-2xl relative border">
        {/* Exit Button */}
        <button
          onClick={() => setAlbumScreenOpen(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Workspace Manager
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="create" className="w-full">
            <TabsList>
              <TabsTrigger value="create">Create Album</TabsTrigger>
              <TabsTrigger value="load">Load Album</TabsTrigger>
              <TabsTrigger value="sync">Sync</TabsTrigger>
            </TabsList>

            {/* Create Album Tab */}
            <TabsContent value="create" className="space-y-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Album Name:</span>
                <Input
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Enter album name..."
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Select Folder:</span>
                <CustomPath value={selectedPath} onChange={setSelectedPath} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAlbumScreenOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={testFunction}>
                  Test
                </Button>
              </div>
            </TabsContent>

            {/* Load Album Tab */}
            <TabsContent value="load" className="pt-2 min-h-32 flex flex-col justify-start space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Enter Album Name to Load:</span>
                <Input
                  value={loadText}
                  onChange={(e) => setLoadText(e.target.value)}
                  placeholder="e.g. temp_test_album2"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={testLoadAlbum} className="h-8 text-xs">
                  Load Album
                </Button>
              </div>
            </TabsContent>

            {/* Sync Tab */}
            <TabsContent value="sync" className="pt-2 min-h-32 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground font-medium">Sync Settings</p>
                <p className="text-xs text-muted-foreground/75 mt-1">This feature is a placeholder and will allow advanced workspace syncing in a future update.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlbumScreen;