// store.ts
import { create } from "zustand";
import type {
    OrderedRankItems,
    ImageViewCache,
    ImageView,
    ImageFrontendRepresentation,
    AlbumView,
    SelectedOverviewImage,
} from "./types";

// TODO MAKE THIS A STATE!
const WORKSPACE = "N/A";

// kaiso://localhost/{workspace}/{id} — matches your register_uri_scheme_protocol
function thumbLink(id: number, workspace: string): string {
    return `http://kaiso.localhost/thumb/${workspace}/${id}`;
}

// backend ImageView -> frontend row (drop id from the body, add the thumb link)
function toFrontend(v: ImageView, workspace: string): ImageFrontendRepresentation {
    return { name: v.name, meta: v.meta, path: v.path, thumbLink: thumbLink(v.id, workspace) };
}

interface FrontendProgressStore {
    textStatus: string;
    setTextStatus: (textStatus: string) => void;
    count: number;
    setCount: (count: number) => void;
    total: number;
    setTotal: (total: number) => void;
}

export const useFrontendProgressStore = create<FrontendProgressStore>((set) => ({
    textStatus: "Idle",
    count: 0,
    total: 0,
    setTextStatus: (textStatus: string) => set({ textStatus: textStatus }),
    setCount: (count: number) => set({ count: count }),
    setTotal: (total: number) => set({ total: total }),
}))

interface FrontendGridStore {
    orderedIds: OrderedRankItems;
    cache: ImageViewCache;
    isAlbumScreenOpen: boolean;
    isSearching: boolean;
    changeOrderedIds: (ranked: OrderedRankItems) => void;
    resetCache: () => void;
    addToCache: (rows: ImageView[]) => void;
    setAlbumScreenOpen: (open: boolean) => void;
    setIsSearching: (searching: boolean) => void;
}

interface FrontendConfigStore {
    currentWorkspace: string;
    setCurrentWorkspace: (workspace: string) => void;
    workspaces: AlbumView[];
    setWorkspaces: (workspaces: AlbumView[]) => void;
    isIndexing: boolean;
    setIsIndexing: (indexing: boolean) => void;
    previewFlag: boolean;
    setPreviewFlag: (previewFlag: boolean) => void;
    currentPreviewPath: string; // TODO refactor later, we technically dont need to pass in path
    // since the backend is also storing the path, 
    setCurrentPreviewPath: (currentPreviewPath: string) => void;
}

export const useConfigStore = create<FrontendConfigStore>((set) => ({
    currentWorkspace: WORKSPACE, // currently the default
    setCurrentWorkspace: (workspace: string) => set({ currentWorkspace: workspace }),
    workspaces: [],
    setWorkspaces: (workspaces) => set({ workspaces }),
    isIndexing: false,
    setIsIndexing: (indexing) => set({ isIndexing: indexing }),
    previewFlag: false,
    setPreviewFlag: (previewFlag: boolean) => set({ previewFlag: previewFlag }),
    currentPreviewPath: "", // default is none
    setCurrentPreviewPath: (currentPreviewPath: string) => set({ currentPreviewPath: currentPreviewPath }),
}));

export const useGridStore = create<FrontendGridStore>((set) => ({
    orderedIds: [],
    cache: new Map(),
    isAlbumScreenOpen: false,
    isSearching: false,

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
    resetCache: () => set({ cache: new Map() }), // when load new album/create new one (implicit load) then clear previous cache
    setAlbumScreenOpen: (open) => set({ isAlbumScreenOpen: open }),
    setIsSearching: (searching) => set({ isSearching: searching }),
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

interface OverviewPanelStore {
    selectedImage: SelectedOverviewImage,
    setSelectedImage: (selectedImage: SelectedOverviewImage) => void,
}

export const useOverviewPanelStore = create<OverviewPanelStore>((set) => ({
    selectedImage: {
        id: 0,
        name: "",
        path: "",
        albumName: "",
        size: 0,
        dimension: { width: 0, height: 0 },
        createdAt: { secs_since_epoch: 0, nanos_since_epoch: 0 },
        modifiedAt: { secs_since_epoch: 0, nanos_since_epoch: 0 },
    },
    setSelectedImage: (selectedImage) => set({ selectedImage: selectedImage }),
}));