import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getRaindrops } from "../../lib/raindrop-client";
import { shapeRaindrop, createPaginationMeta } from "../../lib/response-shaper";
import type { FieldLevel } from "../../lib/types";

export const schema = {
  collectionId: z
    .number()
    .default(0)
    .describe("Collection ID: 0=all, -1=unsorted, -99=trash, or specific collection ID"),
  search: z
    .string()
    .optional()
    .describe("Search query. Supports operators like #tag, type:article, domain:example.com"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by tags (AND logic). Example: ['javascript', 'tutorial']"),
  type: z
    .enum(["link", "article", "image", "video", "document", "audio"])
    .optional()
    .describe("Filter by content type"),
  domain: z
    .string()
    .optional()
    .describe("Filter by domain. Example: 'github.com'"),
  important: z
    .boolean()
    .optional()
    .describe("Filter by important/favorite status"),
  page: z
    .number()
    .min(0)
    .default(0)
    .describe("Page number (0-indexed)"),
  perPage: z
    .number()
    .min(1)
    .max(50)
    .default(25)
    .describe("Items per page (max 50, default 25 for token efficiency)"),
  sort: z
    .enum(["-created", "created", "score", "-sort", "title", "-title", "domain", "-domain"])
    .default("-created")
    .describe("Sort order. Prefix with - for descending. 'score' for search relevance."),
  fields: z
    .enum(["minimal", "summary", "standard", "full"])
    .default("summary")
    .describe("Level of detail in response"),
  includeNested: z
    .boolean()
    .default(false)
    .describe("Include raindrops from nested sub-collections"),
};

export const metadata: ToolMetadata = {
  name: "search_raindrops",
  description:
    "Search and list raindrops (bookmarks). Primary tool for finding bookmarks. " +
    "Use search query for full-text search, or filter params for targeted queries. " +
    "Returns paginated results with token-efficient field selection.",
  annotations: {
    title: "Search Raindrops",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

function buildSearchQuery(params: {
  search?: string;
  tags?: string[];
  type?: string;
  domain?: string;
  important?: boolean;
}): string | undefined {
  const parts: string[] = [];

  if (params.search) {
    parts.push(params.search);
  }

  if (params.tags && params.tags.length > 0) {
    for (const tag of params.tags) {
      parts.push(`#${tag}`);
    }
  }

  if (params.type) {
    parts.push(`type:${params.type}`);
  }

  if (params.domain) {
    parts.push(`domain:${params.domain}`);
  }

  if (params.important !== undefined) {
    parts.push(params.important ? "❤️" : "-❤️");
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
}

export default async function searchRaindrops({
  collectionId,
  search,
  tags,
  type,
  domain,
  important,
  page,
  perPage,
  sort,
  fields,
  includeNested,
}: InferSchema<typeof schema>) {
  // Build the search query string
  const searchQuery = buildSearchQuery({ search, tags, type, domain, important });

  // Fetch raindrops from API
  const response = await getRaindrops(collectionId, {
    search: searchQuery,
    sort,
    page,
    perpage: perPage,
    nested: includeNested,
  });

  // Shape items based on requested field level
  const items = response.items.map((item) =>
    shapeRaindrop(item, fields as FieldLevel)
  );

  // Create pagination metadata
  const meta = createPaginationMeta(response.count, page, perPage);

  return {
    items,
    meta,
    query: {
      collectionId,
      search: searchQuery,
      sort,
    },
  };
}
