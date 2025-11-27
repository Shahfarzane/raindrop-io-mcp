import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import {
  getRaindrop,
  getTags,
  suggestForRaindrop,
  updateRaindrop,
} from "../../lib/raindrop-client";
import { shapeTags } from "../../lib/response-shaper";

export const schema = {
  raindropId: z.number().describe("ID of the raindrop to auto-tag"),
  maxTags: z
    .number()
    .default(5)
    .describe("Maximum number of tags to apply (default 5)"),
};

export const metadata: ToolMetadata = {
  name: "auto_tag_raindrop",
  description:
    "Automatically generate and apply tags to a raindrop. " +
    "Returns metadata and suggestions for LLM to generate final tags, then applies them. " +
    "Use the generate-tags prompt with the returned data, then call again with the generated tags.",
  annotations: {
    title: "Auto-Tag Raindrop",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function autoTagRaindrop({
  raindropId,
  maxTags,
}: InferSchema<typeof schema>) {
  // Fetch the raindrop details
  const raindropRes = await getRaindrop(raindropId);
  const raindrop = raindropRes.item;

  // Get Raindrop's own suggestions
  let raindropSuggestions: { tags: string[]; collections: number[] } = {
    tags: [],
    collections: [],
  };
  try {
    const suggestRes = await suggestForRaindrop(raindropId);
    raindropSuggestions = {
      tags: suggestRes.item.tags || [],
      collections: suggestRes.item.collections?.map((c) => c.$id) || [],
    };
  } catch {
    // Suggestions may fail for some items, continue without them
  }

  // Get user's existing tag vocabulary for consistency
  const tagsRes = await getTags();
  const userVocabulary = shapeTags(tagsRes.items)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map((t) => t.name);

  // Prepare metadata for LLM analysis
  const metadata = {
    title: raindrop.title,
    link: raindrop.link,
    domain: raindrop.domain,
    excerpt: raindrop.excerpt,
    type: raindrop.type,
    note: raindrop.note,
    highlights: raindrop.highlights?.map((h) => h.text) || [],
    existingTags: raindrop.tags || [],
  };

  return {
    raindropId,
    metadata,
    raindropSuggestions,
    userVocabulary,
    maxTags,
    instructions:
      "Use the generate-tags prompt with this data to create tags. " +
      "Then use update_raindrop to apply the generated tags.",
  };
}
