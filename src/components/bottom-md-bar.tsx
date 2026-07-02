import { useBottomBarStore } from "../lib/store";

const BottomMdBar = () => {
  const status = useBottomBarStore((s) => s.status);
  const range = useBottomBarStore((s) => s.range);
  const bottomStatus = useBottomBarStore((s) => s.bottomStatus);

  return (
    <div className="bg-primary text-primary-foreground text-[10px] font-mono h-6 px-3 flex items-center justify-between select-none shrink-0 uppercase tracking-wider">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`h-1.5 w-1.5 rounded-full ${status ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`} />
          <span>status: {status ? "true" : "false"}</span>
        </div>
        <div className="w-px h-3 bg-primary-foreground/20" />
        <span className="font-semibold">range: {range.startIndex} - {range.endIndex}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-semibold">bottomStatus: {bottomStatus ? "true" : "false"}</span>
      </div>
    </div>
  );
};

export default BottomMdBar;
