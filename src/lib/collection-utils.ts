import { getCollections, createCollection } from "./raindrop-client";

/**
 * Find an existing collection by name or create a new one
 * @param name - The collection name to find or create
 * @returns Object with collection id, name, and whether it was created
 */
export async function getOrCreateCollection(
	name: string
): Promise<{ id: number; name: string; created: boolean }> {
	// Get all collections
	const collectionsResponse = await getCollections();

	// Look for existing collection with this name (case-insensitive)
	const existing = collectionsResponse.items.find(
		(c) => c.title.toLowerCase() === name.toLowerCase()
	);

	if (existing) {
		return { id: existing._id, name: existing.title, created: false };
	}

	// Create new collection
	const newCollection = await createCollection({ title: name });

	return {
		id: newCollection.item._id,
		name: newCollection.item.title,
		created: true,
	};
}
