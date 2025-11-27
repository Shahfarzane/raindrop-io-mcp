import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { createCollection } from "../../lib/raindrop-client";

export const schema = {
  title: z.string().describe("Name for the new collection"),
  parentId: z
    .number()
    .optional()
    .describe("Parent collection ID to nest this collection under"),
  view: z
    .enum(["list", "simple", "grid", "masonry"])
    .optional()
    .describe("Default view for displaying raindrops"),
  public: z.boolean().optional().describe("Make collection publicly viewable"),
  color: z.string().optional().describe("Collection color (e.g., '#ff0000')"),
};

export const metadata: ToolMetadata = {
  name: "create_collection",
  description: "Create a new collection in your Raindrop.io library.",
  annotations: {
    title: "Create Collection",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function createCollectionTool({
  title,
  parentId,
  view,
  public: isPublic,
  color,
}: InferSchema<typeof schema>) {
  const response = await createCollection({
    title,
    parent: parentId !== undefined ? { $id: parentId } : undefined,
    view,
    public: isPublic,
    color,
  });

  return {
    id: response.item._id,
    title: response.item.title,
    parentId: response.item.parent?.$id,
  };
}
