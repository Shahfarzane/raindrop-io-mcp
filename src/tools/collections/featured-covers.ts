import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getFeaturedCovers } from "../../lib/raindrop-client";

export const schema = {
  maxPerCategory: z
    .number()
    .optional()
    .default(5)
    .describe("Maximum icons to return per category (default: 5)"),
};

export const metadata: ToolMetadata = {
  name: "get_featured_covers",
  description:
    "Get featured/curated collection cover icons provided by Raindrop.io. Returns categorized icons that can be used as collection covers. Use the PNG URL from results with update_collection to set a collection's icon.",
  annotations: {
    title: "Get Featured Covers",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function getFeaturedCoversTool({
  maxPerCategory = 5,
}: InferSchema<typeof schema>) {
  const response = await getFeaturedCovers();

  const categories = response.items.map((category) => ({
    title: category.title,
    icons: category.icons.slice(0, maxPerCategory).map((icon) => icon.png),
  }));

  return {
    structuredContent: {
      totalCategories: categories.length,
      categories,
      usage:
        "To set a collection cover, use update_collection with cover: ['<png_url>']",
    },
  };
}
