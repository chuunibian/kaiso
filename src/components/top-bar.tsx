import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TopBar = () => {

  // since no flex 1 given it stays static to its self size
  // if add flex 1 it shares the space with the test grid
  return (
    <Card className="rounded-none border-x-0 border-t-0 shrink-0">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          Top Bar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>Top Bar</p>
      </CardContent>
    </Card>
  );
};

export default TopBar;
