// Selection panel — right sidebar shown when multi-select mode is active
import { useGridStore, useSelectedEntitiesStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
    CheckCheck,
    XCircle,
    X,
    Trash2,
    FolderOutput,
    Tags,
} from "lucide-react";

const SelectPanel = () => {
    const selectedCount = useSelectedEntitiesStore((s) => s.selectedSet.size);
    const clearSelected = useSelectedEntitiesStore((s) => s.clearSelectedSet);
    const addManySelectedSet = useSelectedEntitiesStore((s) => s.addManySelectedSet);
    const totalCount = useGridStore((s) => s.orderedIds.length);

    const selectAll = () => {
        const ids = useGridStore.getState().orderedIds.map((o) => o.id);
        addManySelectedSet(ids);
    };

    const deselectAll = () => {
        useSelectedEntitiesStore.setState({ selectedSet: new Set<number>() });
    };

    return (
        <div className="w-72 min-w-[288px] border-l border-border bg-card p-4 flex flex-col gap-4 text-card-foreground overflow-y-auto h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground select-none">Selection</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    title="Exit multi-select"
                    onClick={clearSelected}
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Count */}
            <span className="text-xs text-muted-foreground select-none">
                {selectedCount} of {totalCount} selected
            </span>

            <hr className="border-border" />

            {/* Quick actions */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
                    Quick Actions
                </span>
                <Button
                    variant="ghost"
                    className="justify-start h-8 px-2.5 text-xs text-foreground hover:bg-pink-500/10 hover:text-pink-300 cursor-pointer"
                    onClick={selectAll}
                >
                    <CheckCheck className="h-3.5 w-3.5 mr-2 text-pink-400" />
                    Select All
                </Button>
                <Button
                    variant="ghost"
                    className="justify-start h-8 px-2.5 text-xs text-foreground hover:bg-pink-500/10 hover:text-pink-300 cursor-pointer"
                    onClick={deselectAll}
                    disabled={selectedCount === 0}
                >
                    <XCircle className="h-3.5 w-3.5 mr-2 text-pink-400" />
                    Deselect All
                </Button>
            </div>

            <hr className="border-border" />

            {/* Batch actions */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
                    Batch Actions
                </span>
                <Button
                    variant="ghost"
                    className="justify-start h-8 px-2.5 text-xs text-muted-foreground cursor-not-allowed opacity-50"
                    disabled
                >
                    <FolderOutput className="h-3.5 w-3.5 mr-2" />
                    Move to Album
                </Button>
                <Button
                    variant="ghost"
                    className="justify-start h-8 px-2.5 text-xs text-muted-foreground cursor-not-allowed opacity-50"
                    disabled
                >
                    <Tags className="h-3.5 w-3.5 mr-2" />
                    Tag Selected
                </Button>
                <Button
                    variant="ghost"
                    className="justify-start h-8 px-2.5 text-xs text-muted-foreground cursor-not-allowed opacity-50"
                    disabled
                >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete Selected
                </Button>
            </div>
        </div>
    );
};

export default SelectPanel;