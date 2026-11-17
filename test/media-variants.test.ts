import { describe, it, expect } from "vitest";
import { fileNameForMedia, parseHlsMasterVariants } from "../lib/media/sniffer";

const MASTER = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
https://cdn.example.com/1080p/index.m3u8
# a comment between the tag and its URI
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720

720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=128000
audio/index.m3u8
`;

describe("parseHlsMasterVariants", () => {
  it("lists variants highest bandwidth first with resolution labels", () => {
    const v = parseHlsMasterVariants(MASTER, "https://example.com/video/master.m3u8");
    expect(v.map((x) => x.quality)).toEqual(["1080p", "720p", "360p", "128 kbps"]);
  });

  it("resolves relative and absolute playlist URIs against the master URL", () => {
    const v = parseHlsMasterVariants(MASTER, "https://example.com/video/master.m3u8");
    expect(v.find((x) => x.quality === "360p")?.url).toBe(
      "https://example.com/video/360p/index.m3u8"
    );
    expect(v.find((x) => x.quality === "1080p")?.url).toBe(
      "https://cdn.example.com/1080p/index.m3u8"
    );
  });

  it("returns nothing for a media playlist", () => {
    const media = "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nseg0.ts\n#EXT-X-ENDLIST\n";
    expect(parseHlsMasterVariants(media, "https://example.com/a.m3u8")).toEqual([]);
  });

  it("caps the list at 12 variants", () => {
    let text = "#EXTM3U\n";
    for (let i = 1; i <= 20; i++) {
      text += `#EXT-X-STREAM-INF:BANDWIDTH=${i * 1000},RESOLUTION=100x${i}\nv${i}.m3u8\n`;
    }
    expect(parseHlsMasterVariants(text, "https://example.com/m.m3u8")).toHaveLength(12);
  });
});

describe("fileNameForMedia", () => {
  it("keeps the real extension of direct files instead of .bin", () => {
    expect(fileNameForMedia("My Clip", "https://cdn.example.com/v/clip.webm?sig=1", "direct")).toBe(
      "My Clip.webm"
    );
    expect(fileNameForMedia("Song", "https://cdn.example.com/a/song.mp3", "direct")).toBe(
      "Song.mp3"
    );
  });

  it("falls back to mp4 and strips characters Windows forbids", () => {
    expect(fileNameForMedia('a/b:c*"d', "https://x.example/stream", "direct")).toBe("a_b_c__d.mp4");
  });

  it("names HLS downloads .mp4 and appends the chosen quality", () => {
    expect(fileNameForMedia("Show", "https://x.example/a.m3u8", "hls", "720p")).toBe(
      "Show [720p].mp4"
    );
    expect(fileNameForMedia("Show", "https://x.example/a.m3u8", "hls", "Auto (best)")).toBe(
      "Show.mp4"
    );
  });
});
