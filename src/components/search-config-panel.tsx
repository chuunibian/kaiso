// Search configuration — replaces the search bar in-place when the magnifier is
// clicked, filling the same horizontal slot at the same h-10 height. All options
// here are MOCK/wireframe placeholders for the retrieval + reranking pipeline.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, RotateCcw } from "lucide-react";

export type SearchConfig = {
  retrieval: string;
  reranking: string;
  enhancements: string[];
};

export const defaultSearchConfig: SearchConfig = {
  retrieval: "semantic",
  reranking: "none",
  enhancements: [],
};

// `label` is the compact chip text, `full` the expanded name used in tooltips,
// `short` the badge token shown inside the search bar.
type Choice = { id: string; label: string; full?: string; short?: string };

const RETRIEVAL_CHOICES: Choice[] = [
  { id: "semantic", label: "Semantic", full: "Semantic (CLIP)", short: "CLIP" },
  { id: "bm25", label: "BM25", full: "Filename BM25", short: "BM25" },
  { id: "semantic-name", label: "Sem. name", full: "Semantic filename", short: "CLIP·NAME" },
  { id: "hybrid", label: "Hybrid", short: "HYBRID" },
];

const RERANK_CHOICES: Choice[] = [
  { id: "none", label: "None" },
  { id: "clip", label: "CLIP", short: "RR·CLIP" },
  { id: "blip", label: "BLIP", short: "RR·BLIP" },
  { id: "clip-blip", label: "CLIP+BLIP", full: "CLIP + BLIP", short: "RR·C+B" },
];

const ENHANCEMENT_CHOICES: Choice[] = [
  { id: "x", label: "X", full: "Enhancement X" },
  { id: "y", label: "Y", full: "Enhancement Y" },
  { id: "z", label: "Z", full: "Enhancement Z" },
];

const fullLabelOf = (choices: Choice[], id: string) => {
  const choice = choices.find((c) => c.id === id);
  return choice ? choice.full ?? choice.label : "—";
};

const shortLabelOf = (choices: Choice[], id: string) => {
  const choice = choices.find((c) => c.id === id);
  return choice ? choice.short ?? choice.label.toUpperCase() : "—";
};

export const isDefaultConfig = (config: SearchConfig) =>
  config.retrieval === defaultSearchConfig.retrieval &&
  config.reranking === defaultSearchConfig.reranking &&
  config.enhancements.length === 0;

// Badges showing what was picked for this search — they live inside the search
// bar on its right. Defaults are omitted so only what you actually changed
// takes up room.
export const ConfigBadges = ({ config }: { config: SearchConfig }) => {
  const badges = [
    {
      key: "retrieval",
      text: shortLabelOf(RETRIEVAL_CHOICES, config.retrieval),
      title: `Retrieval: ${fullLabelOf(RETRIEVAL_CHOICES, config.retrieval)}`,
    },
    ...(config.reranking === "none"
      ? []
      : [
          {
            key: "rerank",
            text: shortLabelOf(RERANK_CHOICES, config.reranking),
            title: `Rerank: ${fullLabelOf(RERANK_CHOICES, config.reranking)}`,
          },
        ]),
    ...(config.enhancements.length === 0
      ? []
      : [
          {
            key: "enhancements",
            text: config.enhancements.map((id) => id.toUpperCase()).join("·"),
            title: `Enhancements: ${config.enhancements
              .map((id) => fullLabelOf(ENHANCEMENT_CHOICES, id))
              .join(", ")}`,
          },
        ]),
  ];

  return (
    <div className="hidden md:flex shrink-0 items-center gap-1">
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          variant="outline"
          title={badge.title}
          className="h-5 px-1.5 rounded-md border-border/60 bg-background/40 text-[10px] tracking-wide text-muted-foreground select-none"
        >
          {badge.text}
        </Badge>
      ))}
    </div>
  );
};

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-6 shrink-0 px-2 rounded-lg border text-[11px] leading-none transition-colors cursor-pointer",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background/40 text-muted-foreground border-border/50 hover:text-foreground hover:border-border"
    )}
  >
    {children}
  </button>
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground/80 select-none">
    {children}
  </span>
);

const Divider = () => <span className="h-4 w-px shrink-0 bg-border/70" />;

const IconButton = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
  >
    {children}
  </button>
);

const SearchConfigPanel = ({
  config,
  setConfig,
  onBack,
}: {
  config: SearchConfig;
  setConfig: (config: SearchConfig) => void;
  onBack: () => void;
}) => {
  const toggleEnhancement = (id: string) =>
    setConfig({
      ...config,
      enhancements: config.enhancements.includes(id)
        ? config.enhancements.filter((e) => e !== id)
        : [...config.enhancements, id],
    });

  return (
    <div className="flex h-10 items-center gap-1.5 pl-1.5 pr-1.5 rounded-xl bg-muted/20 border border-border/50 shadow-xs">
      <IconButton title="Back to search" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </IconButton>

      <Divider />

      {/* Options scroll horizontally so the strip never grows taller than the bar */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <GroupLabel>Retrieval</GroupLabel>
        {RETRIEVAL_CHOICES.map((c) => (
          <Chip
            key={c.id}
            active={config.retrieval === c.id}
            onClick={() => setConfig({ ...config, retrieval: c.id })}
          >
            {c.label}
          </Chip>
        ))}

        <Divider />

        <GroupLabel>Rerank</GroupLabel>
        {RERANK_CHOICES.map((c) => (
          <Chip
            key={c.id}
            active={config.reranking === c.id}
            onClick={() => setConfig({ ...config, reranking: c.id })}
          >
            {c.label}
          </Chip>
        ))}

        <Divider />

        <GroupLabel>Enhance</GroupLabel>
        {ENHANCEMENT_CHOICES.map((c) => (
          <Chip
            key={c.id}
            active={config.enhancements.includes(c.id)}
            onClick={() => toggleEnhancement(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <Divider />

      <IconButton title="Reset to defaults" onClick={() => setConfig(defaultSearchConfig)}>
        <RotateCcw className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
};

export default SearchConfigPanel;
