// components/Titlebar.tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const appWindow = getCurrentWindow();

export function Titlebar() {
    return (
        <div
            data-tauri-drag-region
            className="flex h-8 select-none items-center justify-between bg-background border-b border-border"
        >
            <span
                data-tauri-drag-region
                className="px-3 text-xs font-medium text-muted-foreground"
            >
                Prism
            </span>

            <div className="flex items-end gap-0.5 h-4">
                <span className="w-0.5 bg-red-500 animate-[bar_0.8s_ease-in-out_infinite]" />
                <span className="w-0.5 bg-red-500 animate-[bar_0.8s_ease-in-out_infinite_0.4s]" />
            </div>

            <div className="flex">
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