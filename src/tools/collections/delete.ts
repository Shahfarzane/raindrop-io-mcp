import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { deleteCollection, emptyTrash } from "../../lib/raindrop-client";

export const schema = {
  id: z
    .number()
    .describe(
      "Collection ID to delete. Use -99 to empty the trash (permanently deletes all trashed items)."
    ),
};

export const metadata: ToolMetadata = {
  name: "delete_collection",
  description:
    "Delete a collection. All raindrops will be moved to Trash. " +
    "Use id=-99 to permanently empty the Trash.",
  annotations: {
    title: "Delete Collection",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  },
};

export default async function deleteCollectionTool({
  id,
}: InferSchema<typeof schema>) {
  if (id === -99) {
    await emptyTrash();
    return {
      deleted: true,
      message: "Trash has been emptied",
    };
  }

  await deleteCollection(id);
  return {
    deleted: true,
    id,
  };
}
