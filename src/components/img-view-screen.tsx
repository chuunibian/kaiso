import React, { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { useConfigStore } from "@/lib/store";

const ImgViewScreen = () => {
    const currentPreviewPath = useConfigStore((s) => s.currentPreviewPath);
    const setPreviewFlag = useConfigStore((s) => s.setPreviewFlag);

    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const translateStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
        setPreviewFlag(false);
    };

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Scroll to zoom
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale((prev) => {
                const next = Math.min(Math.max(prev + delta, 0.1), 10);
                // Reset pan when zooming back to fit
                if (next <= 1) {
                    setTranslate({ x: 0, y: 0 });
                }
                return next;
            });
        },
        []
    );

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

    return (
        <div
            ref={containerRef}
            className="flex-1 h-full flex items-center justify-center relative select-none overflow-hidden"
            style={{ background: "transparent", cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Close button */}
            <button
                onClick={handleClose}
                className="absolute top-2 right-2 z-10 p-1 rounded-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close preview"
            >
                <X className="h-4 w-4" />
            </button>

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