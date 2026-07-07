import { useOverviewPanelStore } from '@/lib/store'
import React from 'react'
import { formatSize } from '@/lib/utils'

function formatDimension(dim: { width: number; height: number }): string {
    if (!dim || (dim.width === 0 && dim.height === 0)) return "—";
    return `${dim.width} × ${dim.height} px`;
}

function formatDate(time: { secs_since_epoch: number }): string {
    if (!time || time.secs_since_epoch === 0) return "—";
    const date = new Date(time.secs_since_epoch * 1000);
    return date.toLocaleString();
}

const OverviewPanel = () => {
    const currentSelectedImage = useOverviewPanelStore((s) => s.selectedImage)
    const isSelected = currentSelectedImage && currentSelectedImage.name !== "";

    if (!isSelected) {
        return (
            <div className="w-80 min-w-[320px] border-l border-zinc-800 bg-zinc-950 p-5 flex flex-col items-center justify-center text-zinc-500 h-full select-none">
                <p className="text-sm font-medium">No image selected</p>
                <p className="text-xs text-zinc-600 mt-1 text-center">Select an image to view details</p>
            </div>
        );
    }

    return (
        <div className="w-80 min-w-[320px] border-l border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-5 text-zinc-300 overflow-y-auto h-full">
            <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider select-none">Metadata</h3>
                <h2 className="text-base font-semibold text-zinc-100 break-words select-text">
                    {currentSelectedImage.name}
                </h2>
            </div>

            <hr className="border-zinc-800" />

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Path</span>
                    <span className="break-all font-mono text-xs text-zinc-400 select-text bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 leading-relaxed">
                        {currentSelectedImage.path}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Size</span>
                        <span className="text-zinc-300 font-medium select-text">
                            {currentSelectedImage.size ? formatSize(currentSelectedImage.size) : "—"}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Dimensions</span>
                        <span className="text-zinc-300 font-medium select-text">
                            {formatDimension(currentSelectedImage.dimension)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Created</span>
                        <span className="text-zinc-300 select-text">
                            {formatDate(currentSelectedImage.createdAt)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Modified</span>
                        <span className="text-zinc-300 select-text">
                            {formatDate(currentSelectedImage.modifiedAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OverviewPanel