import TopBar from "./top-bar";
import TestGrid from "./test-grid";
import OverviewPanel from "./overview-panel";
import BottomMdBar from "./bottom-md-bar";

const SearchScreen = () => {
    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <TopBar />
            <div className="flex flex-row flex-1 min-h-0 w-full">
                <TestGrid />
                <OverviewPanel />
            </div>
            <BottomMdBar />
        </div>
    );
};

export default SearchScreen;