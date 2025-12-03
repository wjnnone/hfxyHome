export interface SliceResult {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface SplitConfiguration {
  splitY1: number; // Always 640 based on prompt
  splitY2: number; // User adjustable, default 1440 (640 + 800)
}