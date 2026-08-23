import TopBar from "./top-bar";
import TestGrid from "./test-grid";
import OverviewPanel from "./overview-panel";
import SelectPanel from "./select-panel";
import BottomMdBar from "./bottom-md-bar";
import { IndexingView } from "./temp-mosaic";
import { useConfigStore, useGridStore, useTopBarStateStore, useSelectedEntitiesStore } from "@/lib/store";
import ImgViewScreen from "./img-view-screen";

const EmptyWorkspaceView = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 select-none">
            {/* app logo later */}
            <span className="text-sm text-zinc-600 tracking-wide">
                No workspace selected
            </span>
        </div>
    );
};

const SearchScreen = () => {
    const isIndexing = useConfigStore((s) => s.isIndexing);
    const previewFlag = useConfigStore((s) => s.previewFlag);
    const currentWorkspace = useConfigStore((s) => s.currentWorkspace);
    const informationPanelFlag = useTopBarStateStore((s) => s.informationPanelFlag);
    const multiSelectMode = useSelectedEntitiesStore((s) => s.multiSelectMode);
    const hasItems = useGridStore((s) => s.orderedIds.length > 0);

    const showEmptyState = currentWorkspace === "N/A" && !hasItems && !isIndexing;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <TopBar />
            <div className="flex flex-row flex-1 min-h-0 w-full relative">
                {showEmptyState ? (
                    <EmptyWorkspaceView />
                ) : isIndexing ? (
                    <IndexingView />
                ) : (
                    <>
                        {/* Always mounted so VirtuosoGrid keeps scroll position */}
                        <div className="flex-1 min-w-0 h-full relative">
                            <TestGrid />
                            {/* Overlay only over the grid area when previewing */}
                            {previewFlag && (
                                <div className="absolute inset-0 z-10 flex bg-zinc-950">
                                    <ImgViewScreen />
                                </div>
                            )}
                        </div>
                    </>
                )}
                {/* Right sidebar: selection panel takes priority over overview */}
                {!showEmptyState && (multiSelectMode ? <SelectPanel /> : informationPanelFlag && <OverviewPanel />)}
            </div>
            <BottomMdBar />
        </div>
    );
};

export default SearchScreen;

