import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	getCollections,
	createCollection,
	createRaindrops,
	getRaindrops,
} from "../../lib/raindrop-client";
import type { XLocalTweet, XLocalImportResult } from "../../lib/x-local-types";
import type { CreateRaindropRequest, RaindropType } from "../../lib/types";

export const schema = {
	directory: z
		.string()
		.optional()
		.describe("Path to directory containing X.com JSON export files"),
	collectionName: z
		.string()
		.optional()
		.default("X-Book")
		.describe("Name of the Raindrop collection to import into"),
};

export const metadata: ToolMetadata = {
	name: "import_x_from_file",
	description:
		"Import X.com (Twitter) bookmarks from local JSON export files into a Raindrop collection. Reads twitter-Bookmarks-*.json files and batch-imports them.",
	annotations: {
		title: "Import X Bookmarks from File",
		readOnlyHint: false,
		idempotentHint: false,
	},
};

const BATCH_SIZE = 100;

/**
 * Find or create the target collection
 */
async function getOrCreateCollection(
	name: string
): Promise<{ id: number; name: string; created: boolean }> {
	const collectionsResponse = await getCollections();
	const existing = collectionsResponse.items.find(
		(c) => c.title.toLowerCase() === name.toLowerCase()
	);

	if (existing) {
		return { id: existing._id, name: existing.title, created: false };
	}

	const newCollection = await createCollection({ title: name });
	return {
		id: newCollection.item._id,
		name: newCollection.item.title,
		created: true,
	};
}

/**
 * Get existing X.com URLs in a collection to avoid duplicates
 */
async function getExistingXUrls(collectionId: number): Promise<Set<string>> {
	const urls = new Set<string>();
	let page = 0;
	const perPage = 50;

	while (true) {
		const response = await getRaindrops(collectionId, {
			page,
			perpage: perPage,
			search: "x.com OR twitter.com",
		});

		for (const item of response.items) {
			if (item.link.includes("x.com/") || item.link.includes("twitter.com/")) {
				// Normalize URL to handle both x.com and twitter.com
				const normalizedUrl = item.link
					.replace("twitter.com", "x.com")
					.replace(/\/$/, "");
				urls.add(normalizedUrl);
			}
		}

		if (response.items.length < perPage) {
			break;
		}
		page++;
	}

	return urls;
}

/**
 * Convert a local tweet export to a Raindrop bookmark
 */
function tweetToRaindrop(
	tweet: XLocalTweet,
	collectionId: number
): CreateRaindropRequest {
	// Build title with author
	const maxTitleLength = 80;
	const titleText =
		tweet.full_text.length > maxTitleLength
			? `${tweet.full_text.slice(0, maxTitleLength)}...`
			: tweet.full_text;
	const title = `@${tweet.screen_name}: ${titleText}`;

	// Build note with metadata
	const createdDate = tweet.created_at
		? new Date(tweet.created_at).toLocaleDateString()
		: "Unknown date";

	const engagement = [
		tweet.favorite_count !== undefined ? `${tweet.favorite_count} likes` : null,
		tweet.retweet_count !== undefined
			? `${tweet.retweet_count} retweets`
			: null,
		tweet.reply_count !== undefined ? `${tweet.reply_count} replies` : null,
		tweet.views_count !== undefined ? `${tweet.views_count} views` : null,
	]
		.filter(Boolean)
		.join(", ");

	const note = [
		`Imported from X.com`,
		`Author: ${tweet.name} (@${tweet.screen_name})`,
		`Posted: ${createdDate}`,
		engagement ? `Engagement: ${engagement}` : null,
	]
		.filter(Boolean)
		.join("\n");

	// Determine content type based on media
	let type: RaindropType = "link";
	if (tweet.media && tweet.media.length > 0) {
		const firstMedia = tweet.media[0];
		if (firstMedia.type === "photo") {
			type = "image";
		} else if (
			firstMedia.type === "video" ||
			firstMedia.type === "animated_gif"
		) {
			type = "video";
		}
	}

	// Get cover image (prefer original, fall back to thumbnail)
	const cover =
		tweet.media?.[0]?.original ||
		tweet.media?.[0]?.thumbnail ||
		tweet.media?.[0]?.url;

	// Build media array
	const raindropMedia = tweet.media
		?.filter((m) => m.original || m.thumbnail || m.url)
		.map((m) => ({
			link: m.original || m.thumbnail || m.url,
		}));

	// Normalize URL to use x.com
	const normalizedUrl = tweet.url.replace("twitter.com", "x.com");

	return {
		link: normalizedUrl,
		title,
		excerpt: tweet.full_text,
		note,
		type,
		cover,
		media: raindropMedia,
		collection: { $id: collectionId },
	};
}

/**
 * Find bookmark JSON files in directory
 */
async function findBookmarkFiles(directory: string): Promise<string[]> {
	const files = await readdir(directory);
	return files
		.filter(
			(f) => f.startsWith("twitter-Bookmarks-") && f.endsWith(".json")
		)
		.map((f) => join(directory, f));
}

/**
 * Parse a JSON file and extract tweets
 */
async function parseBookmarkFile(filePath: string): Promise<XLocalTweet[]> {
	const content = await readFile(filePath, "utf-8");
	const data = JSON.parse(content);

	// Handle both array format and object with data property
	if (Array.isArray(data)) {
		return data as XLocalTweet[];
	}
	if (data.data && Array.isArray(data.data)) {
		return data.data as XLocalTweet[];
	}

	throw new Error(`Unexpected file format in ${filePath}`);
}

export default async function importXFromFile({
	directory,
	collectionName,
}: InferSchema<typeof schema>) {
	// Default directory to X-bookmarks in current working directory
	const targetDir = directory || join(process.cwd(), "X-bookmarks");

	// Find bookmark files
	let bookmarkFiles: string[];
	try {
		bookmarkFiles = await findBookmarkFiles(targetDir);
	} catch (error) {
		return {
			structuredContent: {
				status: "error",
				error: "Directory not found",
				message: `Could not read directory: ${targetDir}`,
			},
		};
	}

	if (bookmarkFiles.length === 0) {
		return {
			structuredContent: {
				status: "error",
				error: "No bookmark files found",
				message: `No twitter-Bookmarks-*.json files found in ${targetDir}`,
			},
		};
	}

	// Get or create collection
	const collection = await getOrCreateCollection(collectionName);
	console.log(
		`[X Import] Using collection: "${collection.name}" (ID: ${collection.id}, created: ${collection.created})`
	);

	// Get existing URLs to avoid duplicates
	console.log("[X Import] Checking for existing bookmarks...");
	const existingUrls = await getExistingXUrls(collection.id);
	console.log(`[X Import] Found ${existingUrls.size} existing X.com bookmarks`);

	// Parse all bookmark files
	const allTweets: XLocalTweet[] = [];
	for (const file of bookmarkFiles) {
		try {
			const tweets = await parseBookmarkFile(file);
			allTweets.push(...tweets);
			console.log(`[X Import] Loaded ${tweets.length} tweets from ${file}`);
		} catch (error) {
			console.error(`[X Import] Failed to parse ${file}: ${error}`);
		}
	}

	if (allTweets.length === 0) {
		return {
			structuredContent: {
				status: "error",
				error: "No tweets found",
				message: "Could not parse any tweets from the bookmark files",
			},
		};
	}

	// Filter out duplicates
	const newTweets = allTweets.filter((tweet) => {
		const normalizedUrl = tweet.url
			.replace("twitter.com", "x.com")
			.replace(/\/$/, "");
		return !existingUrls.has(normalizedUrl);
	});

	console.log(
		`[X Import] ${newTweets.length} new tweets to import (${allTweets.length - newTweets.length} duplicates skipped)`
	);

	if (newTweets.length === 0) {
		return {
			structuredContent: {
				status: "success",
				message: "All bookmarks already imported",
				collection: {
					id: collection.id,
					name: collection.name,
				},
				summary: {
					total: allTweets.length,
					imported: 0,
					skipped: allTweets.length,
					failed: 0,
				},
			},
		};
	}

	// Import in batches
	const result: XLocalImportResult = {
		total: allTweets.length,
		imported: 0,
		skipped: allTweets.length - newTweets.length,
		failed: 0,
		errors: [],
	};

	for (let i = 0; i < newTweets.length; i += BATCH_SIZE) {
		const batch = newTweets.slice(i, i + BATCH_SIZE);
		const raindrops = batch.map((tweet) =>
			tweetToRaindrop(tweet, collection.id)
		);

		try {
			await createRaindrops(raindrops);
			result.imported += batch.length;
			console.log(
				`[X Import] Imported batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} bookmarks`
			);
		} catch (error) {
			// If batch fails, try individual imports
			console.error(`[X Import] Batch failed, trying individual imports...`);
			for (let j = 0; j < batch.length; j++) {
				try {
					await createRaindrops([raindrops[j]]);
					result.imported++;
				} catch (individualError) {
					result.failed++;
					result.errors.push({
						tweetId: batch[j].id,
						error:
							individualError instanceof Error
								? individualError.message
								: "Unknown error",
					});
				}
			}
		}
	}

	return {
		structuredContent: {
			status: "success",
			message: `Imported ${result.imported} bookmarks to "${collection.name}"`,
			collection: {
				id: collection.id,
				name: collection.name,
				created: collection.created,
			},
			summary: {
				total: result.total,
				imported: result.imported,
				skipped: result.skipped,
				failed: result.failed,
			},
			errors: result.errors.length > 0 ? result.errors : undefined,
		},
	};
}
