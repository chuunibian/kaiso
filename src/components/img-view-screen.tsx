import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useConfigStore } from "@/lib/store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const ImgViewScreen = () => {
    const currentPreviewPath = useConfigStore((s) => s.currentPreviewPath);
    const setPreviewFlag = useConfigStore((s) => s.setPreviewFlag);

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

    const imageUrl = `http://kaiso.localhost/full/${currentPreviewPath}`;

    return (
        <div className="flex-1 h-full bg-zinc-950 flex flex-col items-center justify-center p-6 relative select-none">
            {/* Main Image Container Card */}
            <Card className="relative w-full max-w-4xl bg-zinc-900 border-zinc-800 shadow-2xl overflow-hidden flex flex-col justify-between max-h-[85vh]">
                {/* Header/Info bar inside Card */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded-sm"
                    onClick={handleClose}
                >
                    <X className="h-4 w-4" />
                </Button>

                {/* Full-view Image wrapper */}
                <div className="flex-1 bg-black/40 flex items-center justify-center p-2 min-h-0">
                    <img
                        src={imageUrl}
                        alt="Full size preview"
                        className="max-w-full max-h-[70vh] object-contain select-text"
                    />
                </div>
            </Card>
        </div>
    );
};

export default ImgViewScreen;