import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { createRaindrop } from "../../lib/raindrop-client";

export const schema = {
  link: z.string().url().describe("The URL to bookmark"),
  title: z
    .string()
    .optional()
    .describe("Custom title. If omitted, will be auto-extracted from the page."),
  collectionId: z
    .number()
    .optional()
    .describe("Collection ID to save to. Omit for Unsorted (-1)."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to assign. Example: ['javascript', 'tutorial']"),
  note: z
    .string()
    .optional()
    .describe("Personal note to attach to the bookmark"),
  important: z
    .boolean()
    .optional()
    .describe("Mark as favorite/important"),
  pleaseParse: z
    .boolean()
    .default(true)
    .describe("Auto-extract metadata (title, description, cover) from the URL"),
};

export const metadata: ToolMetadata = {
  name: "create_raindrop",
  description:
    "Create a new raindrop (bookmark). " +
    "By default, metadata is auto-extracted from the URL. " +
    "Returns minimal response with ID and title for token efficiency.",
  annotations: {
    title: "Create Raindrop",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function createOneRaindrop({
  link,
  title,
  collectionId,
  tags,
  note,
  important,
  pleaseParse,
}: InferSchema<typeof schema>) {
  const response = await createRaindrop({
    link,
    title,
    collection: collectionId ? { $id: collectionId } : undefined,
    tags,
    note,
    important,
    pleaseParse: pleaseParse ? {} : undefined,
  });

  // Return minimal response
  return {
    structuredContent: {
      id: response.item._id,
      title: response.item.title,
      link: response.item.link,
    },
  };
}
