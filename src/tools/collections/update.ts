import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { updateCollection } from "../../lib/raindrop-client";

export const schema = {
  id: z.number().describe("Collection ID to update"),
  title: z.string().optional().describe("New collection name"),
  parentId: z
    .number()
    .optional()
    .describe("Move to new parent collection (use -1 to make root)"),
  view: z
    .enum(["list", "simple", "grid", "masonry"])
    .optional()
    .describe("Default view for displaying raindrops"),
  public: z.boolean().optional().describe("Make collection publicly viewable"),
  expanded: z.boolean().optional().describe("Expand in sidebar"),
  color: z.string().optional().describe("Collection color"),
  cover: z
    .array(z.string())
    .optional()
    .describe(
      "Collection cover/icon URL(s). Use search_collection_covers to find icons, then pass the PNG URL here."
    ),
};

export const metadata: ToolMetadata = {
  name: "update_collection",
  description: "Update a collection's properties.",
  annotations: {
    title: "Update Collection",
    readOnlyHint: false,
    idempotentHint: true,
  },
};

export default async function updateCollectionTool({
  id,
  title,
  parentId,
  view,
  public: isPublic,
  expanded,
  color,
  cover,
}: InferSchema<typeof schema>) {
  const updates: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  if (title !== undefined) {
    updates.title = title;
    updatedFields.push("title");
  }
  if (parentId !== undefined) {
    updates.parent = { $id: parentId };
    updatedFields.push("parent");
  }
  if (view !== undefined) {
    updates.view = view;
    updatedFields.push("view");
  }
  if (isPublic !== undefined) {
    updates.public = isPublic;
    updatedFields.push("public");
  }
  if (expanded !== undefined) {
    updates.expanded = expanded;
    updatedFields.push("expanded");
  }
  if (color !== undefined) {
    updates.color = color;
    updatedFields.push("color");
  }
  if (cover !== undefined) {
    updates.cover = cover;
    updatedFields.push("cover");
  }

  await updateCollection(id, updates);

  return {
    structuredContent: {
      id,
      updated: updatedFields,
    },
  };
}
