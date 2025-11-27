import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { deleteRaindrop } from "../../lib/raindrop-client";

export const schema = {
  id: z.number().describe("The raindrop ID to delete"),
};

export const metadata: ToolMetadata = {
  name: "delete_raindrop",
  description:
    "Delete a raindrop (bookmark). " +
    "If not in Trash, moves to Trash. If already in Trash, permanently deletes.",
  annotations: {
    title: "Delete Raindrop",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  },
};

export default async function deleteOneRaindrop({
  id,
}: InferSchema<typeof schema>) {
  await deleteRaindrop(id);

  return {
    deleted: true,
    id,
  };
}
