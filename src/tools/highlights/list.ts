import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getHighlights, getHighlightsByCollection } from "../../lib/raindrop-client";
import { createPaginationMeta } from "../../lib/response-shaper";

export const schema = {
  collectionId: z
    .number()
    .optional()
    .describe("Filter highlights to a specific collection (omit for all)"),
  page: z.number().default(0).describe("Page number (0-indexed)"),
  perPage: z.number().max(50).default(25).describe("Items per page (max 50)"),
};

export const metadata: ToolMetadata = {
  name: "list_highlights",
  description:
    "List highlighted text from your raindrops. " +
    "Highlights are text passages you've marked in bookmarked articles. " +
    "Each highlight includes the text, color, optional note, and source raindrop info.",
  annotations: {
    title: "List Highlights",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function listHighlights({
  collectionId,
  page,
  perPage,
}: InferSchema<typeof schema>) {
  const params = { page, perpage: perPage };

  const response =
    collectionId !== undefined
      ? await getHighlightsByCollection(collectionId, params)
      : await getHighlights(params);

  const highlights = response.items.map((item) => ({
    id: item._id,
    text: item.text,
    color: item.color,
    note: item.note,
    created: item.created,
    raindrop: {
      id: item.raindropRef,
      title: item.title,
      link: item.link,
    },
  }));

  return {
    highlights,
    meta: createPaginationMeta(response.items.length, page, perPage),
  };
}
