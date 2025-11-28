import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getCollections, getChildCollections } from "../../lib/raindrop-client";
import { shapeCollection } from "../../lib/response-shaper";
import type { FieldLevel, CollectionFull, CollectionTree } from "../../lib/types";

export const schema = {
  parentId: z
    .number()
    .optional()
    .describe("Filter to children of this collection ID. Omit for root collections."),
  fields: z
    .enum(["minimal", "summary", "full"])
    .default("summary")
    .describe("Level of detail: minimal (id, title), summary (+count, parent), full (all fields)"),
  includeChildren: z
    .boolean()
    .default(true)
    .describe("Include nested child collections in a tree structure"),
};

export const metadata: ToolMetadata = {
  name: "list_collections",
  description:
    "List collections from your Raindrop.io library. Returns a tree structure with counts. " +
    "System collections: -1 (Unsorted), -99 (Trash) are not included but can be used with other tools.",
  annotations: {
    title: "List Collections",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

function buildTree(
  rootCollections: CollectionFull[],
  childCollections: CollectionFull[],
  fields: FieldLevel
): CollectionTree[] {
  // Create a map of parent ID to children
  const childrenMap = new Map<number, CollectionFull[]>();

  for (const child of childCollections) {
    const parentId = child.parent?.$id;
    if (parentId !== undefined) {
      const existing = childrenMap.get(parentId) || [];
      existing.push(child);
      childrenMap.set(parentId, existing);
    }
  }

  // Recursive function to build tree
  function buildNode(collection: CollectionFull): CollectionTree {
    const shaped = shapeCollection(collection, fields) as unknown as CollectionTree;
    const children = childrenMap.get(collection._id) || [];
    shaped.children = children.map(buildNode);
    return shaped;
  }

  return rootCollections.map(buildNode);
}

export default async function listCollections({
  parentId,
  fields,
  includeChildren,
}: InferSchema<typeof schema>) {
  // Fetch root collections
  const rootRes = await getCollections();
  let rootCollections = rootRes.items;

  // If parentId specified, filter to just that parent's children
  if (parentId !== undefined) {
    const childRes = await getChildCollections();
    const children = childRes.items.filter((c) => c.parent?.$id === parentId);

    if (includeChildren) {
      // Build subtree from this parent
      const tree = buildTree(children, childRes.items, fields);
      return {
        structuredContent: {
          collections: tree,
          total: children.length,
          parentId,
        },
      };
    }

    // Just return the direct children, shaped
    return {
      structuredContent: {
        collections: children.map((c) => shapeCollection(c, fields)),
        total: children.length,
        parentId,
      },
    };
  }

  // Full tree from root
  if (includeChildren) {
    const childRes = await getChildCollections();
    const tree = buildTree(rootCollections, childRes.items, fields);
    return {
      structuredContent: {
        collections: tree,
        total: rootCollections.length,
      },
    };
  }

  // Just root collections, no tree
  return {
    structuredContent: {
      collections: rootCollections.map((c) => shapeCollection(c, fields)),
      total: rootCollections.length,
    },
  };
}
