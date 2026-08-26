// components/Titlebar.tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/lib/store";

const appWindow = getCurrentWindow();

export function Titlebar() {
    const isIndexing = useConfigStore((s) => s.isIndexing);

    return (
        <div
            data-tauri-drag-region
            className="flex h-8 select-none items-center justify-between bg-background border-b border-border relative overflow-hidden"
        >
            <span
                data-tauri-drag-region
                className={`px-3 text-xs font-semibold tracking-wider z-10 ${
                    isIndexing ? "kaiso-logo" : "text-muted-foreground"
                }`}
            >
                <style>{`
                    @keyframes kaiso-shimmer {
                        0%, 100% {
                            background-position: -100% center;
                        }
                        40%, 60% {
                            background-position: 200% center;
                        }
                    }
                    .kaiso-logo {
                        background: linear-gradient(
                            90deg,
                            var(--muted-foreground) 0%,
                            var(--muted-foreground) 35%,
                            var(--foreground) 50%,
                            var(--muted-foreground) 65%,
                            var(--muted-foreground) 100%
                        );
                        background-size: 200% 100%;
                        -webkit-background-clip: text;
                        background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: kaiso-shimmer 3.5s ease-in-out infinite;
                    }
                `}</style>
                kaiso
            </span>



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