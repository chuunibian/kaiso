import TopBar from "./top-bar";
import TestGrid from "./test-grid";
import OverviewPanel from "./overview-panel";
import BottomMdBar from "./bottom-md-bar";
import { IndexingView } from "./temp-mosaic";
import { useConfigStore } from "@/lib/store";
import ImgViewScreen from "./img-view-screen";

const SearchScreen = () => {
    const isIndexing = useConfigStore((s) => s.isIndexing);
    const previewFlag = useConfigStore((s) => s.previewFlag); // true if in preview else false

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <TopBar />
            <div className="flex flex-row flex-1 min-h-0 w-full relative">
                {isIndexing ? (
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
                <OverviewPanel />
            </div>
            <BottomMdBar />
        </div>
    );
};

export default SearchScreen;