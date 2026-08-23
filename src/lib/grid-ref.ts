// Shared module-level ref for VirtuosoGrid imperative handle.
// Used by TestGrid (assigns) and TopBar (calls scrollToIndex).
import { createRef } from "react";
import type { VirtuosoGridHandle } from "react-virtuoso";

export const virtuosoGridRef = createRef<VirtuosoGridHandle>();
