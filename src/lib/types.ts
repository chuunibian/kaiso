export interface SystemTime {
  secs_since_epoch: number;
  nanos_since_epoch: number;
}

export interface ImageMetadata {
  date_created: SystemTime;
  size: number;
  date_modified: SystemTime;
}

export interface ImageView {
  id: number;
  meta: ImageMetadata;
  name: string;
  path: string;
}

export interface ImageOrder {
  id: number;
  confidence_score: number;
}

export interface AlbumView {
  name: string;
  description: string;
  path: string;
  date: SystemTime;
}

export interface ImageFrontendRepresentation {
  // id: number; // uneeded since 
  name: string;
  meta: ImageMetadata;
  path: string;
  thumbLink: string; // this is constructed via the frontend
}


// This is the main FE cache used for representing the current album

export type OrderedRankItems = ImageOrder[];               // just an array of ranked items
export type ImageViewCache = Map<number, ImageFrontendRepresentation>;  // just the id -> row map

// Not currently used
export interface FrontendCache {
  orderedIds: OrderedRankItems;
  cache: ImageViewCache;
}
