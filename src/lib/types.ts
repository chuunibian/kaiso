export interface SystemTime {
  secs_since_epoch: number;
  nanos_since_epoch: number;
}

export interface ImageMetadata {
  date_created: SystemTime;
  size: number;
  date_modified: SystemTime;
  dimensions?: ImageDimensions;
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

// used for create workspace progress update
export interface Progress {
  done: number;
  total: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/*
  File name
  Album
  Path
  size
  Dim
  created at 
  mod at

*/
export interface SelectedOverviewImage {
  id: number;
  name: string;
  path: string;
  albumName: string;
  size: number;
  dimension: ImageDimensions;
  createdAt: SystemTime;
  modifiedAt: SystemTime;
}
