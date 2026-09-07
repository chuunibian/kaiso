// TopBar — stacks the two sections. Everything else lives in the row files.
import { Card, CardContent } from "@/components/ui/card";
import TopBarSearchRow from "./top-bar-search-row";
import TopBarControlsRow from "./top-bar-controls-row";

const TopBar = () => {
  return (
    <Card className="rounded-none border-x-0 border-t-0 shrink-0 overflow-hidden">
      <CardContent className="flex flex-col gap-1 pt-1 pb-1 px-3 min-w-0">
        {/* Row 1: Search bar and adjustments */}
        <TopBarSearchRow />

        {/* Row 2: Workspace details, filtering, zooms layout */}
        <TopBarControlsRow />
      </CardContent>
    </Card>
  );
};

export default TopBar;
