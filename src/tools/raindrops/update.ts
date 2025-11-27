import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { updateRaindrop } from "../../lib/raindrop-client";

export const schema = {
  id: z.number().describe("The raindrop ID to update"),
  title: z.string().optional().describe("New title"),
  collectionId: z
    .number()
    .optional()
    .describe("Move to this collection ID"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Replace all tags with these. Use empty array [] to remove all tags."),
  note: z.string().optional().describe("Update the personal note"),
  important: z.boolean().optional().describe("Set favorite/important status"),
  cover: z.string().url().optional().describe("Set custom cover image URL"),
  excerpt: z.string().optional().describe("Update the excerpt/description"),
};

export const metadata: ToolMetadata = {
  name: "update_raindrop",
  description:
    "Update an existing raindrop (bookmark). " +
    "Only provided fields will be updated. " +
    "Returns minimal response showing which fields were updated.",
  annotations: {
    title: "Update Raindrop",
    readOnlyHint: false,
    idempotentHint: true,
  },
};

export default async function updateOneRaindrop({
  id,
  title,
  collectionId,
  tags,
  note,
  important,
  cover,
  excerpt,
}: InferSchema<typeof schema>) {
  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  if (title !== undefined) {
    updates.title = title;
    updatedFields.push("title");
  }

  if (collectionId !== undefined) {
    updates.collection = { $id: collectionId };
    updatedFields.push("collection");
  }

  if (tags !== undefined) {
    updates.tags = tags;
    updatedFields.push("tags");
  }

  if (note !== undefined) {
    updates.note = note;
    updatedFields.push("note");
  }

  if (important !== undefined) {
    updates.important = important;
    updatedFields.push("important");
  }

  if (cover !== undefined) {
    updates.cover = cover;
    updatedFields.push("cover");
  }

  if (excerpt !== undefined) {
    updates.excerpt = excerpt;
    updatedFields.push("excerpt");
  }

  if (updatedFields.length === 0) {
    return {
      id,
      updated: [],
      message: "No fields to update",
    };
  }

  await updateRaindrop(id, updates);

  return {
    id,
    updated: updatedFields,
  };
}
