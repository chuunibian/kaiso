import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore, useGridStore, useOverviewPanelStore } from "@/lib/store";
import type { ImageView } from "@/lib/types";

const ImgViewScreen = () => {
    const currentPreviewPath = useConfigStore((s) => s.currentPreviewPath);
    const currentPreviewId = useConfigStore((s) => s.currentPreviewId);
    const setCurrentPreviewPath = useConfigStore((s) => s.setCurrentPreviewPath);
    const setCurrentPreviewId = useConfigStore((s) => s.setCurrentPreviewId);
    const setPreviewFlag = useConfigStore((s) => s.setPreviewFlag);
    const setSelectedImage = useOverviewPanelStore((s) => s.setSelectedImage);

    const orderedIds = useGridStore((s) => s.orderedIds);

    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const translateStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Find current index in orderedIds
    let currentIndex = -1;
    if (currentPreviewId != null) {
        currentIndex = orderedIds.findIndex((item) => item.id === currentPreviewId);
    }
    if (currentIndex === -1 && currentPreviewPath) {
        const cache = useGridStore.getState().cache;
        for (let i = 0; i < orderedIds.length; i++) {
            const cached = cache.get(orderedIds[i].id);
            if (cached && cached.path === currentPreviewPath) {
                currentIndex = i;
                break;
            }
        }
    }

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < orderedIds.length - 1;

    // usecallback to memoiz this function's creation
    const navigateToIndex = useCallback(
        async (targetIndex: number) => {
            if (targetIndex < 0 || targetIndex >= orderedIds.length) return;
            const targetId = orderedIds[targetIndex].id;
            let cached = useGridStore.getState().cache.get(targetId);

            if (!cached) {
                try {
                    const fetched = await invoke<ImageView[]>("lazy_load_data", { ids: [targetId] });
                    if (fetched && fetched.length > 0) {
                        useGridStore.getState().addToCache(fetched);
                        cached = useGridStore.getState().cache.get(targetId);
                    }
                } catch (e) {
                    console.error("Failed to load image preview data", e);
                }
            }

            if (cached) {
                setCurrentPreviewId(targetId);
                setCurrentPreviewPath(cached.path);
                setSelectedImage({
                    id: targetId,
                    name: cached.name,
                    path: cached.path,
                    albumName: "",
                    size: cached.meta.size,
                    dimension: { width: 0, height: 0 },
                    createdAt: { secs_since_epoch: 0, nanos_since_epoch: 0 },
                    modifiedAt: { secs_since_epoch: 0, nanos_since_epoch: 0 },
                });
            }
        },
        [orderedIds, setCurrentPreviewId, setCurrentPreviewPath, setSelectedImage]
    );

    const handleClose = useCallback(() => {
        setPreviewFlag(false);
    }, [setPreviewFlag]);

    // Keyboard navigation (Escape to close, Left/Right arrows to navigate)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            } else if (e.key === "ArrowLeft") {
                if (hasPrev) navigateToIndex(currentIndex - 1);
            } else if (e.key === "ArrowRight") {
                if (hasNext) navigateToIndex(currentIndex + 1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleClose, hasPrev, hasNext, currentIndex, navigateToIndex]);

    // Scroll to zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => {
            const next = Math.min(Math.max(prev + delta, 0.1), 10);
            if (next <= 1) {
                setTranslate({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    // Pan (drag) when zoomed in
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (scale <= 1) return;
            e.preventDefault();
            setIsPanning(true);
            panStart.current = { x: e.clientX, y: e.clientY };
            translateStart.current = { ...translate };
        },
        [scale, translate]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanning) return;
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setTranslate({
                x: translateStart.current.x + dx,
                y: translateStart.current.y + dy,
            });
        },
        [isPanning]
    );

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Reset zoom & pan on image change
    useEffect(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    }, [currentPreviewPath]);

    const imageUrl = `http://kaiso.localhost/full/${currentPreviewPath}`;
    const currentName = currentPreviewId != null ? useGridStore.getState().cache.get(currentPreviewId)?.name : "";

    return (
        <div
            ref={containerRef}
            className="flex-1 h-full flex items-center justify-center relative select-none overflow-hidden bg-zinc-950/90 backdrop-blur-xs"
            style={{ cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Top Bar Overlay: Image Counter & Name + Close button */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-md text-xs text-zinc-300 pointer-events-auto shadow-md max-w-[80%] truncate">
                    {currentIndex >= 0 && (
                        <span className="font-mono font-medium text-pink-400">
                            {currentIndex + 1} / {orderedIds.length}
                        </span>
                    )}
                    {currentIndex >= 0 && currentName && (
                        <span className="text-zinc-500 font-mono text-[10px]">|</span>
                    )}
                    {currentName && (
                        <span className="truncate text-zinc-200" title={currentName}>
                            {currentName}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleClose}
                    className="p-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer pointer-events-auto shadow-md"
                    aria-label="Close preview"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Left Navigation Arrow */}
            {hasPrev && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigateToIndex(currentIndex - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-110 active:scale-95 backdrop-blur-md"
                    title="Previous Image (Left Arrow)"
                    aria-label="Previous image"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}

            {/* Right Navigation Arrow */}
            {hasNext && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigateToIndex(currentIndex + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-110 active:scale-95 backdrop-blur-md"
                    title="Next Image (Right Arrow)"
                    aria-label="Next image"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            )}

            {/* Image */}
            <img
                src={imageUrl}
                alt="Full size preview"
                draggable={false}
                className="max-w-full max-h-full object-contain"
                style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: isPanning ? "none" : "transform 0.15s ease-out",
                }}
            />
        </div>
    );
};

export default ImgViewScreen;