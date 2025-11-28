import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import {
  getRaindrop,
  getTags,
  suggestForUrl,
  suggestForRaindrop,
  updateRaindrop,
} from "../../lib/raindrop-client";
import { shapeTags } from "../../lib/response-shaper";

export const schema = {
  raindropId: z
    .number()
    .optional()
    .describe("Analyze an existing raindrop by ID"),
  url: z
    .string()
    .url()
    .optional()
    .describe("Analyze a URL (for new bookmarks before saving)"),
  includeUserVocabulary: z
    .boolean()
    .default(true)
    .describe("Include user's existing tags for consistency"),
  maxSuggestions: z
    .number()
    .default(5)
    .describe("Maximum number of suggested tags to return"),
  applyImmediately: z
    .boolean()
    .default(false)
    .describe("If true and tags provided, apply them immediately to the raindrop"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to apply (only used with applyImmediately=true and raindropId)"),
};

export const metadata: ToolMetadata = {
  name: "suggest_tags",
  description:
    "Get tag suggestions for a raindrop or URL. Returns metadata and Raindrop's suggestions " +
    "for LLM to analyze. Use with generate-tags prompt for intelligent tagging. " +
    "Can also auto-apply tags when applyImmediately=true.",
  annotations: {
    title: "Suggest Tags",
    readOnlyHint: false, // Can write if applyImmediately
    idempotentHint: false,
  },
};

export default async function suggestTags({
  raindropId,
  url,
  includeUserVocabulary,
  maxSuggestions,
  applyImmediately,
  tags,
}: InferSchema<typeof schema>) {
  // Validate input
  if (!raindropId && !url) {
    throw new Error("Either raindropId or url must be provided");
  }

  // If applying tags immediately
  if (applyImmediately && tags && tags.length > 0 && raindropId) {
    await updateRaindrop(raindropId, { tags });
    return `Applied tags [${tags.join(", ")}] to raindrop ${raindropId}`;
  }

  // Get metadata and suggestions
  let metadata: {
    title: string;
    excerpt?: string;
    domain?: string;
    type?: string;
    highlights?: string[];
    note?: string;
    existingTags?: string[];
  };

  let raindropSuggestions: {
    tags: string[];
    collections: number[];
  };

  if (raindropId) {
    // Analyze existing raindrop
    const [raindropRes, suggestRes] = await Promise.all([
      getRaindrop(raindropId),
      suggestForRaindrop(raindropId),
    ]);

    const item = raindropRes.item;
    metadata = {
      title: item.title,
      excerpt: item.excerpt,
      domain: item.domain,
      type: item.type,
      highlights: item.highlights?.map((h) => h.text),
      note: item.note,
      existingTags: item.tags,
    };

    raindropSuggestions = {
      tags: suggestRes.item.tags.slice(0, maxSuggestions),
      collections: suggestRes.item.collections.map((c) => c.$id),
    };
  } else {
    // Analyze URL
    const suggestRes = await suggestForUrl(url!);

    metadata = {
      title: "", // URL analysis doesn't return full metadata
      domain: new URL(url!).hostname,
    };

    raindropSuggestions = {
      tags: suggestRes.item.tags.slice(0, maxSuggestions),
      collections: suggestRes.item.collections.map((c) => c.$id),
    };
  }

  // Get user's tag vocabulary if requested
  let userVocabulary: { name: string; count: number }[] = [];
  if (includeUserVocabulary) {
    const tagsRes = await getTags();
    userVocabulary = shapeTags(tagsRes.items)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  return {
    structuredContent: {
      raindropId,
      url,
      metadata,
      raindropSuggestions,
      userVocabulary,
      instructions:
        "Use the generate-tags prompt with this data to produce intelligent tag suggestions. " +
        "Consider the metadata, existing tags, Raindrop's suggestions, and user's tag vocabulary.",
    },
  };
}
