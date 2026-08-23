import { useBottomBarStore } from "../lib/store";

const BottomMdBar = () => {
  const status = useBottomBarStore((s) => s.status);
  const range = useBottomBarStore((s) => s.range);
  const bottomStatus = useBottomBarStore((s) => s.bottomStatus);

  return (
    <div className="bg-secondary border-t border-border text-secondary-foreground text-[10px] font-mono h-6 px-3 flex items-center justify-between select-none uppercase tracking-wider">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-bold">
          <style>{`
            @keyframes rotate-square {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(90deg); }
            }
          `}</style>
          <span
            className="inline-block w-[8px] h-[8px] rounded-[1px]"
            style={{
              backgroundColor: 'var(--primary)',
              animation: status ? 'rotate-square 0.8s steps(2) infinite' : 'none',
              opacity: status ? 1 : 0.4,
              transition: 'opacity 0.3s ease',
            }}
          />
          <span>status: {status ? "true" : "false"}</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span className="font-semibold">range: {range.startIndex} - {range.endIndex}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-semibold">bottomStatus: {bottomStatus ? "true" : "false"}</span>
      </div>
    </div>
  );
};

export default BottomMdBar;

