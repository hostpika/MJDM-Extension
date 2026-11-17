export type MediaKind = "hls" | "dash" | "direct";

export interface DetectedMedia {
  id: string;
  tabId: number;
  url: string;
  kind: MediaKind;
  contentType?: string;
  contentLength?: number;
  title?: string;
  quality?: string;
  /** Peak bandwidth in bits/s (HLS variants). */
  bandwidth?: number;
  /** Id of the master playlist this variant was expanded from. */
  variantOf?: string;
  discoveredAt: number;
}
