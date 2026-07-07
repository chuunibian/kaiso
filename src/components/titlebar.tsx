// components/Titlebar.tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const appWindow = getCurrentWindow();

export function Titlebar() {
    return (
        <div
            data-tauri-drag-region
            className="flex h-8 select-none items-center justify-between bg-background border-b border-border relative overflow-hidden"
        >
            <span
                data-tauri-drag-region
                className="px-3 text-xs font-semibold tracking-wider text-muted-foreground z-10"
            >
                kaiso
            </span>

            {/* Sleek Rotating Square Loading Animation */}
            <div className="absolute left-16 top-0 bottom-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-6 h-6 flex items-center justify-center relative">
                    <style>{`
                        @keyframes rotate-square {
                            0% {
                                transform: rotate(0deg);
                            }
                            100% {
                                transform: rotate(90deg);
                            }
                        }
                        .rotating-square {
                            width: 8px;
                            height: 8px;
                            background-color: var(--primary);
                            border-radius: 1px;
                            animation: rotate-square 0.8s steps(2) infinite;
                        }
                    `}</style>
                    <div className="rotating-square" />
                </div>
            </div>

            <div className="flex z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => appWindow.minimize()}
                    className="h-8 w-11 rounded-none hover:bg-muted"
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => appWindow.toggleMaximize()}
                    className="h-8 w-11 rounded-none hover:bg-muted"
                >
                    <Square className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => appWindow.close()}
                    className="h-8 w-11 rounded-none hover:bg-destructive hover:text-destructive-foreground"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}