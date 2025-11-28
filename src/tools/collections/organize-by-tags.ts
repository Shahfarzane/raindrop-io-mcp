import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import {
  createCollection,
  getCollections,
  bulkUpdateRaindrops,
} from "../../lib/raindrop-client";

const childCollectionSchema = z.object({
  name: z.string().describe("Child collection name"),
  tags: z.array(z.string()).describe("Tags to move to this child collection"),
});

const collectionSchema = z.object({
  name: z.string().describe("Parent collection name"),
  tags: z
    .array(z.string())
    .describe("Tags to move to this collection (if not in a child)"),
  children: z
    .array(childCollectionSchema)
    .optional()
    .describe("Sub-collections under this parent"),
});

export const schema = {
  collections: z
    .array(collectionSchema)
    .min(1)
    .max(20)
    .describe("Collection hierarchy to create and populate"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("If true, only shows what would happen without making changes"),
};

export const metadata: ToolMetadata = {
  name: "organize_by_tags",
  description:
    "Create a collection hierarchy and move raindrops into collections based on their tags. " +
    "Use with suggest-collection-structure prompt to generate the hierarchy. " +
    "Supports parent collections with optional child sub-collections.",
  annotations: {
    title: "Organize by Tags",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

interface OrganizeResult {
  collection: string;
  parent?: string;
  created: boolean;
  collectionId: number;
  tags: string[];
  movedCount: number;
  errors: string[];
}

export default async function organizeByTags({
  collections,
  dryRun,
}: InferSchema<typeof schema>) {
  const results: OrganizeResult[] = [];
  const existingCollections = await getCollections();
  const existingByName = new Map(
    existingCollections.items.map((c) => [c.title.toLowerCase(), c._id])
  );

  for (const col of collections) {
    // Create or find parent collection
    let parentId = existingByName.get(col.name.toLowerCase());
    let parentCreated = false;

    if (!parentId && !dryRun) {
      const parentRes = await createCollection({ title: col.name });
      parentId = parentRes.item._id;
      parentCreated = true;
      existingByName.set(col.name.toLowerCase(), parentId);
    }

    // Process children first (more specific)
    if (col.children && col.children.length > 0) {
      for (const child of col.children) {
        let childId = existingByName.get(child.name.toLowerCase());
        let childCreated = false;

        if (!childId && !dryRun && parentId) {
          const childRes = await createCollection({
            title: child.name,
            parent: { $id: parentId },
          });
          childId = childRes.item._id;
          childCreated = true;
          existingByName.set(child.name.toLowerCase(), childId);
        }

        const childResult: OrganizeResult = {
          collection: child.name,
          parent: col.name,
          created: childCreated,
          collectionId: childId || 0,
          tags: child.tags,
          movedCount: 0,
          errors: [],
        };

        // Move raindrops with matching tags to child collection
        if (!dryRun && childId) {
          for (const tag of child.tags) {
            try {
              const moveRes = await bulkUpdateRaindrops(
                0, // Search all collections
                { collection: { $id: childId } },
                `#"${tag}"`
              );
              childResult.movedCount += moveRes.modified || 0;
            } catch (err) {
              childResult.errors.push(
                `Failed to move tag "${tag}": ${err instanceof Error ? err.message : "Unknown error"}`
              );
            }
          }
        }

        results.push(childResult);
      }
    }

    // Process parent's own tags (items not caught by children)
    const parentResult: OrganizeResult = {
      collection: col.name,
      created: parentCreated,
      collectionId: parentId || 0,
      tags: col.tags,
      movedCount: 0,
      errors: [],
    };

    // Get tags that aren't handled by children
    const childTags = new Set(
      (col.children || []).flatMap((c) => c.tags.map((t) => t.toLowerCase()))
    );
    const parentOnlyTags = col.tags.filter(
      (t) => !childTags.has(t.toLowerCase())
    );

    if (!dryRun && parentId && parentOnlyTags.length > 0) {
      for (const tag of parentOnlyTags) {
        try {
          const moveRes = await bulkUpdateRaindrops(
            0,
            { collection: { $id: parentId } },
            `#"${tag}"`
          );
          parentResult.movedCount += moveRes.modified || 0;
        } catch (err) {
          parentResult.errors.push(
            `Failed to move tag "${tag}": ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
    }

    results.push(parentResult);
  }

  // Calculate summary
  const totalCollections = results.length;
  const createdCollections = results.filter((r) => r.created).length;
  const totalMoved = results.reduce((sum, r) => sum + r.movedCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return {
    structuredContent: {
      dryRun,
      summary: {
        collectionsProcessed: totalCollections,
        collectionsCreated: createdCollections,
        raindropsMoved: totalMoved,
        errors: totalErrors,
      },
      results: results.map((r) => ({
        collection: r.collection,
        parent: r.parent,
        created: r.created,
        collectionId: r.collectionId,
        tags: r.tags,
        movedCount: r.movedCount,
        errors: r.errors.length > 0 ? r.errors : undefined,
      })),
    },
  };
}
