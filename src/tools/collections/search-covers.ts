import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { searchCovers } from "../../lib/raindrop-client";

export const schema = {
  query: z
    .string()
    .describe("Text to search for icons/covers (e.g., 'pokemon', 'music', 'code')"),
  maxResults: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of icons to return per provider (default: 10)"),
};

export const metadata: ToolMetadata = {
  name: "search_collection_covers",
  description:
    "Search for collection cover icons by text. Returns icons from providers like Icons8 and Iconfinder. Use the PNG URL from results with update_collection to set a collection's icon.",
  annotations: {
    title: "Search Collection Covers",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function searchCoversTool({
  query,
  maxResults = 10,
}: InferSchema<typeof schema>) {
  const response = await searchCovers(query);

  // Flatten and limit results
  const icons: { provider: string; png: string; svg?: string }[] = [];

  for (const provider of response.items) {
    for (const icon of provider.icons.slice(0, maxResults)) {
      icons.push({
        provider: provider.title,
        png: icon.png,
        ...(icon.svg && { svg: icon.svg }),
      });
    }
  }

  return {
    structuredContent: {
      query,
      totalIcons: icons.length,
      icons,
      usage:
        "To set a collection cover, use update_collection with cover: ['<png_url>']",
    },
  };
}
