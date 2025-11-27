import { type ToolMetadata } from "xmcp";
import { getCollections, getRaindrops, getTags, getFilters } from "../../lib/raindrop-client";
import { shapeCollectionMinimal, shapeTags } from "../../lib/response-shaper";
import type { LibraryOverview } from "../../lib/types";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "get_library_overview",
  description:
    "Get an overview of your Raindrop.io library including total counts, root collections, " +
    "top tags, and untagged items. Use this to understand the scope before diving into details.",
  annotations: {
    title: "Library Overview",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function getLibraryOverview(): Promise<LibraryOverview> {
  // Fetch data in parallel for efficiency
  const [collectionsRes, tagsRes, filtersRes, unsortedRes, trashRes] = await Promise.all([
    getCollections(),
    getTags(),
    getFilters(0), // 0 = all collections
    getRaindrops(-1, { perpage: 1 }), // -1 = Unsorted, just need count
    getRaindrops(-99, { perpage: 1 }), // -99 = Trash, just need count
  ]);

  // Calculate total raindrops from all collections
  const totalRaindrops = collectionsRes.items.reduce(
    (sum, col) => sum + col.count,
    0
  ) + unsortedRes.count + trashRes.count;

  // Shape root collections (minimal)
  const rootCollections = collectionsRes.items.map(shapeCollectionMinimal);

  // Shape and limit top tags to 20
  const topTags = shapeTags(tagsRes.items)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalRaindrops,
    totalCollections: collectionsRes.items.length,
    rootCollections,
    topTags,
    untaggedCount: filtersRes.notag.count,
    systemCollections: {
      unsorted: unsortedRes.count,
      trash: trashRes.count,
    },
  };
}
