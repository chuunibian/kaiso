import { useState } from "react";
import {
  FileText,
  Search,
  GitBranch,
  LayoutGrid,
  Play,
  User,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const sidebarItems: SidebarItem[] = [
  { id: "files", label: "Explorer", icon: FileText },
  { id: "search", label: "Search", icon: Search },
  { id: "git", label: "Source Control", icon: GitBranch },
  { id: "extensions", label: "Extensions", icon: LayoutGrid },
  { id: "debug", label: "Run & Debug", icon: Play },
];

const bottomItems: SidebarItem[] = [
  { id: "account", label: "Account", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

const LeftBar = () => {
  const [activeId, setActiveId] = useState("files");

  return (
    <div className="flex flex-col justify-between h-full w-12 bg-sidebar border-r border-sidebar-border select-none shrink-0">
      {/* Top icons */}
      <div className="flex flex-col items-center pt-1 gap-0.5">
        {sidebarItems.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              title={item.label}
              className={`
                relative flex items-center justify-center w-full h-12
                transition-colors duration-150 cursor-pointer
                ${isActive
                  ? "text-sidebar-primary"
                  : "text-muted-foreground hover:text-sidebar-foreground"
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-sidebar-primary rounded-r" />
              )}
              <Icon size={22} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center pb-2 gap-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              title={item.label}
              className={`
                flex items-center justify-center w-full h-12
                transition-colors duration-150 cursor-pointer
                ${activeId === item.id
                  ? "text-sidebar-primary"
                  : "text-muted-foreground hover:text-sidebar-foreground"
                }
              `}
            >
              <Icon size={22} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeftBar;