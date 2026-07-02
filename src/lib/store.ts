// store.ts
import { create } from "zustand";
import type {
    OrderedRankItems,
    ImageViewCache,
    ImageView,
    ImageFrontendRepresentation,
} from "./types";

// TODO MAKE THIS A STATE!
const WORKSPACE = "temp_test_album2";

// kaiso://localhost/{workspace}/{id} — matches your register_uri_scheme_protocol
function thumbLink(id: number, workspace: string): string {
    return `http://kaiso.localhost/thumb/${workspace}/${id}`;
}

// backend ImageView -> frontend row (drop id from the body, add the thumb link)
function toFrontend(v: ImageView, workspace: string): ImageFrontendRepresentation {
    return { name: v.name, meta: v.meta, path: v.path, thumbLink: thumbLink(v.id, workspace) };
}

interface FrontendGridStore {
    orderedIds: OrderedRankItems;
    cache: ImageViewCache;
    isAlbumScreenOpen: boolean;
    changeOrderedIds: (ranked: OrderedRankItems) => void;
    addToCache: (rows: ImageView[]) => void;
    setAlbumScreenOpen: (open: boolean) => void;
}

interface FrontendConfigStore {
    currentWorkspace: string,
    setCurrentWorkspace: (workspace: string) => void;
}

export const useConfigStore = create<FrontendConfigStore>((set) => ({
    currentWorkspace: WORKSPACE, // currently the ddefault
    setCurrentWorkspace: (workspace: string) => set({ currentWorkspace: workspace }),
}));

export const useGridStore = create<FrontendGridStore>((set) => ({
    orderedIds: [],
    cache: new Map(),
    isAlbumScreenOpen: false,

    // new query result — swap the ranking wholesale, leave cache untouched
    changeOrderedIds: (ranked) => set({ orderedIds: ranked }),

    // a batch of lazy-loaded rows — NEW Map so subscribers notice the change
    addToCache: (rows) =>
        set((state) => {
            const workspace = useConfigStore.getState().currentWorkspace;
            const next = new Map(state.cache); // TODO need to explain why of this??
            for (const v of rows) next.set(v.id, toFrontend(v, workspace));
            return { cache: next };
        }),
    setAlbumScreenOpen: (open) => set({ isAlbumScreenOpen: open }),
}));

interface ScrollRange {
    startIndex: number,
    endIndex: number,
}

interface BottomBarStore {
    status: boolean,
    range: ScrollRange,
    bottomStatus: boolean,
    setStatus: (status: boolean) => void;
    setRange: (range: ScrollRange) => void;
    setBottomStatus: (bottomStatus: boolean) => void;
}


export const useBottomBarStore = create<BottomBarStore>((set) => ({
    status: false,
    range: { startIndex: 0, endIndex: 0 },
    bottomStatus: false,
    setStatus: (status: boolean) => set({ status: status }),
    setRange: (range: ScrollRange) => set({ range: range }),
    setBottomStatus: (bottomStatus: boolean) => set({ bottomStatus: bottomStatus }),
}));