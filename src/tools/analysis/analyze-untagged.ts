import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getRaindrops, getTags } from "../../lib/raindrop-client";
import { shapeTags } from "../../lib/response-shaper";

export const schema = {
  collectionId: z
    .number()
    .default(0)
    .describe("Collection to search (0 for all)"),
  limit: z
    .number()
    .max(25)
    .default(10)
    .describe("Number of untagged items to return (max 25)"),
  includeMetadata: z
    .boolean()
    .default(true)
    .describe("Include full metadata for LLM analysis"),
};

export const metadata: ToolMetadata = {
  name: "analyze_untagged",
  description:
    "Find untagged raindrops with metadata for batch tag generation. " +
    "Returns items with title, excerpt, domain, and user vocabulary for LLM to suggest tags. " +
    "Use with generate-tags prompt to process each item.",
  annotations: {
    title: "Analyze Untagged",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function analyzeUntagged({
  collectionId,
  limit,
  includeMetadata,
}: InferSchema<typeof schema>) {
  // Search for untagged items using Raindrop's search syntax
  const response = await getRaindrops(collectionId, {
    search: "notag:true",
    perpage: limit,
    sort: "-created",
  });

  // Get user vocabulary if including metadata
  let userVocabulary: string[] = [];
  if (includeMetadata) {
    const tagsRes = await getTags();
    userVocabulary = shapeTags(tagsRes.items)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map((t) => t.name);
  }

  const items = response.items.map((item) => {
    if (includeMetadata) {
      return {
        id: item._id,
        title: item.title,
        link: item.link,
        domain: item.domain,
        excerpt: item.excerpt,
        type: item.type,
        note: item.note,
        highlights: item.highlights?.map((h) => h.text) || [],
        created: item.created,
      };
    }
    return {
      id: item._id,
      title: item.title,
      domain: item.domain,
    };
  });

  return {
    structuredContent: {
      items,
      total: response.count,
      returned: items.length,
      userVocabulary: includeMetadata ? userVocabulary : undefined,
      instructions:
        "Use the generate-tags prompt for each item. " +
        "Then use update_raindrop or bulk_update_raindrops to apply tags.",
    },
  };
}
