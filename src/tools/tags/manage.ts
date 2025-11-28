import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { renameTags, deleteTags } from "../../lib/raindrop-client";

export const schema = {
  operation: z
    .enum(["rename", "merge", "delete"])
    .describe("Operation: rename (change tag name), merge (combine tags), delete (remove tag)"),
  tags: z
    .array(z.string())
    .describe("Tag(s) to operate on. For merge, all tags in list are merged into newName."),
  newName: z
    .string()
    .optional()
    .describe("New tag name for rename/merge operations"),
  collectionId: z
    .number()
    .optional()
    .describe("Limit operation to specific collection (optional)"),
};

export const metadata: ToolMetadata = {
  name: "manage_tags",
  description:
    "Rename, merge, or delete tags. " +
    "Rename: changes a tag's name across all raindrops. " +
    "Merge: combines multiple tags into one. " +
    "Delete: removes tag from all raindrops.",
  annotations: {
    title: "Manage Tags",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  },
};

export default async function manageTagsTool({
  operation,
  tags,
  newName,
  collectionId,
}: InferSchema<typeof schema>) {
  const targetCollection = collectionId ?? 0;

  switch (operation) {
    case "rename": {
      if (!newName) {
        throw new Error("newName is required for rename operation");
      }
      if (tags.length !== 1) {
        throw new Error("rename operation requires exactly one tag");
      }
      await renameTags(targetCollection, tags[0], newName);
      return `Renamed tag "${tags[0]}" to "${newName}"`;
    }

    case "merge": {
      if (!newName) {
        throw new Error("newName is required for merge operation");
      }
      if (tags.length < 2) {
        throw new Error("merge operation requires at least two tags");
      }
      // Merge by renaming each source tag to the target name
      for (const tag of tags) {
        if (tag !== newName) {
          await renameTags(targetCollection, tag, newName);
        }
      }
      const merged = tags.filter((t) => t !== newName);
      return `Merged tags [${merged.join(", ")}] into "${newName}"`;
    }

    case "delete": {
      await deleteTags(targetCollection, tags);
      return `Deleted tags: ${tags.join(", ")}`;
    }
  }
}
