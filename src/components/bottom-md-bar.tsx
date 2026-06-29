import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BottomMdBar = () => {
  return (
    <Card className="rounded-none border-x-0 border-b-0 shrink-0">
      <CardHeader className="px-1">
        <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          Bottom Bar
        </CardTitle>
      </CardHeader>
    </Card>
  );
};

export default BottomMdBar;
