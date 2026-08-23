// A compact, minimal info card for the currently selected workspace
import { useState } from "react";
import { useGridStore, useConfigStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { FolderKanban, RotateCw } from "lucide-react";

function truncateWorkspaceName(name: string, maxLen = 16): string {
    if (!name) return "";
    if (name.length <= maxLen) return name;
    const keepStart = Math.ceil((maxLen - 1) / 2);
    const keepEnd = Math.floor((maxLen - 1) / 2);
    return name.slice(0, keepStart) + "…" + name.slice(name.length - keepEnd);
}

function truncatePath(path: string, maxLen = 18): string {
    if (!path) return "No path";
    if (path.length <= maxLen) return path;
    return path.slice(0, 6) + "…" + path.slice(path.length - 8);
}

function formatSyncDate(secs: number): string {
    if (!secs) return "Never";
    const d = new Date(secs * 1000);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const WorkspaceInfoCard = () => {
    const setAlbumScreenOpen = useGridStore((s) => s.setAlbumScreenOpen);
    const currentWorkspace = useConfigStore((s) => s.currentWorkspace);
    const workspaces = useConfigStore((s) => s.workspaces);
    const imageCount = useGridStore((s) => s.orderedIds.length);
    const [copiedPath, setCopiedPath] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const workspaceInfo = workspaces.find((w) => w.name === currentWorkspace);
    const pathStr = workspaceInfo?.path || "";
    const syncSecs = workspaceInfo?.date?.secs_since_epoch ?? 0;
    const syncDateFull = syncSecs > 0
        ? new Date(syncSecs * 1000).toLocaleString()
        : "Never";

    const handleCopyPath = () => {
        if (!pathStr) return;
        navigator.clipboard.writeText(pathStr);
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 1500);
    };

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const isNoWorkspace = currentWorkspace === "N/A" || !currentWorkspace;

    return (
        <div className="flex items-center gap-1.5 max-w-full select-none shrink min-w-0 flex-nowrap">
            {/* Integrated Workspace Trigger Pill */}
            <Button
                variant="ghost"
                onClick={() => setAlbumScreenOpen(true)}
                className="h-8 px-2 gap-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border border-zinc-700/70 cursor-pointer shrink shadow-xs transition-colors min-w-0"
                title={isNoWorkspace ? "Open Workspace Manager" : currentWorkspace}
            >
                <FolderKanban className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
                <span className="text-xs font-semibold text-zinc-100 truncate max-w-28 sm:max-w-36 leading-none">
                    {isNoWorkspace ? "Select Workspace" : truncateWorkspaceName(currentWorkspace)}
                </span>
            </Button>

            {/* Metadata Bar Container */}
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-xl bg-muted/20 border border-border/50 shadow-xs h-8 text-xs leading-none shrink min-w-0">
                {/* Path Badge */}
                <span
                    className="px-1.5 py-0.5 rounded-md bg-background/60 border border-border/40 text-muted-foreground hover:text-foreground font-mono text-xs truncate max-w-20 sm:max-w-36 cursor-pointer transition-colors"
                    title={copiedPath ? "Copied!" : pathStr ? `${pathStr} — Click to copy` : "No folder path"}
                    onClick={handleCopyPath}
                >
                    {copiedPath ? "Copied!" : truncatePath(pathStr)}
                </span>

                <span className="text-pink-400/80 font-mono text-[10px] select-none">|</span>

                {/* Image Count */}
                <span
                    className="text-muted-foreground font-mono text-xs tabular-nums px-0.5 font-medium shrink-0"
                    title={`${imageCount.toLocaleString()} total images`}
                >
                    {imageCount.toLocaleString()}
                </span>

                <span className="hidden sm:inline text-pink-400/80 font-mono text-[10px] select-none">|</span>

                {/* Sync Date Badge with Sync Icon */}
                <span
                    className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/60 border border-border/40 text-muted-foreground hover:text-foreground text-xs cursor-pointer transition-colors shrink-0 ${isSyncing ? "opacity-75" : ""
                        }`}
                    title={`Last synced: ${syncDateFull} — Click to sync`}
                    onClick={handleSync}
                >
                    <RotateCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-pink-400" : "text-muted-foreground"}`} />
                    <span>{formatSyncDate(syncSecs)}</span>
                </span>
            </div>
        </div>
    );
};

export default WorkspaceInfoCard;