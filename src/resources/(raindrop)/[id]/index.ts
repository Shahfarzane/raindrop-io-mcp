import { z } from "zod";
import { type ResourceMetadata, type InferSchema } from "xmcp";
import { getRaindrop } from "../../../lib/raindrop-client";

export const schema = {
  id: z.coerce.number().describe("Raindrop ID"),
};

export const metadata: ResourceMetadata = {
  name: "raindrop",
  description:
    "Access a raindrop bookmark by ID. Returns full details including title, link, tags, notes, and highlights.",
  mimeType: "application/json",
};

export default async function raindropResource({
  id,
}: InferSchema<typeof schema>) {
  const response = await getRaindrop(id);
  const item = response.item;

  return JSON.stringify(
    {
      id: item._id,
      title: item.title,
      link: item.link,
      domain: item.domain,
      excerpt: item.excerpt,
      type: item.type,
      tags: item.tags || [],
      note: item.note,
      important: item.important,
      created: item.created,
      lastUpdate: item.lastUpdate,
      collectionId: item.collection?.$id,
      highlights:
        item.highlights?.map((h) => ({
          text: h.text,
          color: h.color,
          note: h.note,
        })) || [],
      cover: item.cover,
    },
    null,
    2
  );
}
