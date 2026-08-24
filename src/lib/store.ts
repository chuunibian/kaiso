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
    // selectedSet: set<number>;
    changeOrderedIds: (ranked: OrderedRankItems) => void;
    resetCache: () => void;
    addToCache: (rows: ImageView[]) => void;
    setAlbumScreenOpen: (open: boolean) => void;
    setIsSearching: (searching: boolean) => void;
    //addIdToSelected()
    //removeIdFromSelected()
    //clearSelected()
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
    currentPreviewId: number | null;
    setCurrentPreviewId: (id: number | null) => void;
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
    currentPreviewId: null,
    setCurrentPreviewId: (id: number | null) => set({ currentPreviewId: id }),
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
            for (const v of rows) {
                next.set(v.id, toFrontend(v, workspace));
            };
            return { cache: next };
        }),
    resetCache: () => set({ cache: new Map() }), // when load new album/create new one (implicit load) then clear previous cache
    setAlbumScreenOpen: (open) => set({ isAlbumScreenOpen: open }),
    setIsSearching: (searching) => set({ isSearching: searching }),
}));

interface ScrollRange {
    startIndex: number;
    endIndex: number;
}

interface BottomBarStore {
    status: boolean;
    range: ScrollRange;
    bottomStatus: boolean;
    zoomLevel: number;
    setStatus: (status: boolean) => void;
    setRange: (range: ScrollRange) => void;
    setBottomStatus: (bottomStatus: boolean) => void;
    setZoomLevel: (zoomLevel: number) => void;
}

export const useBottomBarStore = create<BottomBarStore>((set) => ({
    status: false,
    range: { startIndex: 0, endIndex: 0 },
    bottomStatus: false,
    zoomLevel: 1,
    setStatus: (status: boolean) => set({ status: status }),
    setRange: (range: ScrollRange) => set({ range: range }),
    setBottomStatus: (bottomStatus: boolean) => set({ bottomStatus: bottomStatus }),
    setZoomLevel: (zoomLevel: number) => set({ zoomLevel: zoomLevel }),
}));

interface OverviewPanelStore {
    selectedImage: SelectedOverviewImage;
    hoveredImage: SelectedOverviewImage | null;
    setSelectedImage: (selectedImage: SelectedOverviewImage) => void;
    setHoveredImage: (hoveredImage: SelectedOverviewImage | null) => void;
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
    hoveredImage: null,
    setSelectedImage: (selectedImage) => set({ selectedImage: selectedImage }),
    setHoveredImage: (hoveredImage) => set({ hoveredImage: hoveredImage }),
}));


export enum FilterStatus {
    Score = 'Score',
    Date = 'Date',
    Size = 'Size',
    Name = 'Name',
}

export enum FilterStatusDirection {
    Ascending = 'Ascending',
    Descending = 'Descending',
}

export enum ViewStatus {
    GridView = "Grid View",
    ListView = "List View",
}

export enum AdvancedFilter {
    Regex = 'Regex',
}

interface TopBarStateStore {
    filterStatus: FilterStatus;
    filterStatusDirection: FilterStatusDirection;
    informationPanelFlag: boolean; // toggle visibility of the info panel
    gridSize: number; // basically for the zoom in and out slider should be limited though
    viewStatus: ViewStatus;

    setGridSizeNumber: (gridSize: number) => void;
    setFilterStatus: (filterStatus: FilterStatus) => void;
    setInformationPanelFlag: (flag: boolean) => void;
    setViewStatus: (viewStatus: ViewStatus) => void;
    setFilterStatusDirection: (filterStatusDirection: FilterStatusDirection) => void;
}


export const useTopBarStateStore = create<TopBarStateStore>((set) => ({
    filterStatus: FilterStatus.Score,
    filterStatusDirection: FilterStatusDirection.Descending,
    informationPanelFlag: false,
    gridSize: 7, // default to 7
    viewStatus: ViewStatus.GridView, // default to grid view

    setGridSizeNumber: (gridSize: number) => {
        if (gridSize > 0 && gridSize < 10) {
            set({ gridSize: gridSize })
        }
    },
    setFilterStatus: (filterStatus: FilterStatus) => set({ filterStatus: filterStatus }),
    setInformationPanelFlag: (flag: boolean) => set({ informationPanelFlag: flag }),
    setFilterStatusDirection: (filterStatusDirection: FilterStatusDirection) => set({ filterStatusDirection: filterStatusDirection }),
    setViewStatus: (viewStatus: ViewStatus) => set({ viewStatus: viewStatus }),
}));


// topbarstate store will have a selected entities store later on
interface selectedEntitiesStore {
    selectedSet: Set<number>; // set of ids each of which denotes what cells/image is selected
    multiSelectMode: boolean; // when true, clicking cells toggles selection
    addSelectedSet: (id: number) => void;
    addManySelectedSet: (ids: number[]) => void;
    removeSelectedSet: (id: number) => void;
    toggleSelectedSet: (id: number) => void;
    clearSelectedSet: () => void;
    setMultiSelectMode: (mode: boolean) => void;
}


// TODO review the imp logic of those and rewrite
export const useSelectedEntitiesStore = create<selectedEntitiesStore>((set) => ({
    selectedSet: new Set<number>(),
    multiSelectMode: false,
    addSelectedSet: (id: number) =>
        set((state) => {
            const next = new Set(state.selectedSet);
            next.add(id);
            return { selectedSet: next };
        }),
    addManySelectedSet: (ids: number[]) =>
        set((state) => {
            const next = new Set(state.selectedSet);
            for (const id of ids) next.add(id);
            return { selectedSet: next };
        }),
    removeSelectedSet: (id: number) =>
        set((state) => {
            const next = new Set(state.selectedSet);
            next.delete(id);
            return { selectedSet: next };
        }),
    toggleSelectedSet: (id: number) =>
        set((state) => {
            const next = new Set(state.selectedSet);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { selectedSet: next };
        }),
    clearSelectedSet: () => set({ selectedSet: new Set<number>(), multiSelectMode: false }),
    setMultiSelectMode: (mode: boolean) =>
        set((state) => ({
            multiSelectMode: mode,
            // clear selection when exiting multi-select mode
            selectedSet: mode ? state.selectedSet : new Set<number>(),
        })),
}));
