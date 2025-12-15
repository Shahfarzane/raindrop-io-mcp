import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getOrCreateCollection } from "../../lib/collection-utils";
import { createRaindrop } from "../../lib/raindrop-client";
import type { CreateRaindropRequest, RaindropType } from "../../lib/types";
import { isXAuthenticated } from "../../lib/x-auth";
import { fetchBookmarks, getCurrentXUser } from "../../lib/x-client";
import {
	createImportState,
	saveImportState,
	loadImportState,
	getActiveImport,
	loadExistingTweetIds,
	isTweetProcessed,
	markTweetProcessed,
	addImportError,
	getImportSummary,
} from "../../lib/x-import-state";
import type {
	XTweet,
	XUser,
	XMedia,
	XImportState,
} from "../../lib/x-types";

export const schema = {
	collectionName: z
		.string()
		.optional()
		.default("X-Bookmarks")
		.describe("Name of the Raindrop collection to save bookmarks to"),
	maxResults: z
		.number()
		.optional()
		.describe("Limit number of bookmarks to import (for testing)"),
	resumeImportId: z
		.string()
		.optional()
		.describe("Resume a previous import by its ID"),
};

export const metadata: ToolMetadata = {
	name: "import_x_bookmarks",
	description:
		"Import X.com (Twitter) bookmarks into a Raindrop collection. Supports resuming interrupted imports and detects duplicates. Requires X.com authentication first.",
	annotations: {
		title: "Import X Bookmarks",
		readOnlyHint: false,
		idempotentHint: false,
	},
};

// ============ Helper Functions ============

/**
 * Convert a tweet to a Raindrop bookmark
 */
function tweetToRaindrop(
	tweet: XTweet,
	author: XUser | undefined,
	media: XMedia[] | undefined,
	collectionId: number
): CreateRaindropRequest {
	const username = author?.username || "unknown";
	const authorName = author?.name || username;

	// Build the tweet URL
	const tweetUrl = `https://x.com/${username}/status/${tweet.id}`;

	// Build title (truncate tweet text)
	const maxTitleLength = 80;
	const titleText =
		tweet.text.length > maxTitleLength
			? `${tweet.text.slice(0, maxTitleLength)}...`
			: tweet.text;
	const title = `@${username}: ${titleText}`;

	// Build note with metadata
	const createdDate = tweet.created_at
		? new Date(tweet.created_at).toLocaleDateString()
		: "Unknown date";

	const metrics = tweet.public_metrics;
	const engagement = metrics
		? `${metrics.like_count} likes, ${metrics.retweet_count} retweets, ${metrics.reply_count} replies`
		: "No metrics";

	const note = [
		`Bookmarked from X.com`,
		`Author: ${authorName} (@${username})`,
		`Posted: ${createdDate}`,
		`Engagement: ${engagement}`,
	].join("\n");

	// Extract hashtags for tags
	const hashtags =
		tweet.entities?.hashtags?.map((h) => h.tag.toLowerCase()) || [];
	const tags = ["x-bookmark", ...hashtags];

	// Determine content type
	let type: RaindropType = "link";
	if (media && media.length > 0) {
		const firstMedia = media[0];
		if (firstMedia.type === "photo") {
			type = "image";
		} else if (
			firstMedia.type === "video" ||
			firstMedia.type === "animated_gif"
		) {
			type = "video";
		}
	}

	// Get cover image (first media item)
	const cover = media?.[0]?.url || media?.[0]?.preview_image_url;

	// Build media array for Raindrop
	const raindropMedia = media
		?.filter((m) => m.url || m.preview_image_url)
		.map((m) => ({
			link: m.url || m.preview_image_url || "",
		}));

	return {
		link: tweetUrl,
		title,
		excerpt: tweet.text,
		note,
		tags,
		type,
		cover,
		media: raindropMedia,
		collection: { $id: collectionId },
	};
}

/**
 * Process a batch of tweets and save to Raindrop
 */
async function processTweetBatch(
	tweets: XTweet[],
	usersMap: Map<string, XUser>,
	mediaMap: Map<string, XMedia>,
	state: XImportState
): Promise<{ saved: number; skipped: number; failed: number }> {
	let saved = 0;
	let skipped = 0;
	let failed = 0;

	for (const tweet of tweets) {
		// Check for duplicates
		if (isTweetProcessed(state, tweet.id)) {
			skipped++;
			continue;
		}

		try {
			// Get author info
			const author = usersMap.get(tweet.author_id);

			// Get media info
			const tweetMedia = tweet.attachments?.media_keys
				?.map((key) => mediaMap.get(key))
				.filter((m): m is XMedia => m !== undefined);

			// Convert to Raindrop format
			const raindropData = tweetToRaindrop(
				tweet,
				author,
				tweetMedia,
				state.collectionId
			);

			// Save to Raindrop
			await createRaindrop(raindropData);

			// Mark as processed
			markTweetProcessed(state, tweet.id);
			saved++;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			addImportError(state, tweet.id, errorMessage);
			console.error(`[X Import] Failed to save tweet ${tweet.id}: ${errorMessage}`);
			failed++;
		}
	}

	return { saved, skipped, failed };
}

// ============ Main Handler ============

export default async function importXBookmarksTool({
	collectionName,
	maxResults,
	resumeImportId,
}: InferSchema<typeof schema>) {
	// Check X.com authentication
	if (!isXAuthenticated()) {
		return {
			structuredContent: {
				status: "error",
				error: "Not authenticated with X.com",
				message: "Please run x_authenticate first to connect your X.com account.",
			},
		};
	}

	let state: XImportState;

	// Handle resume vs new import
	if (resumeImportId) {
		const loadedState = loadImportState(resumeImportId);
		if (!loadedState) {
			return {
				structuredContent: {
					status: "error",
					error: "Import not found",
					message: `No import found with ID: ${resumeImportId}`,
				},
			};
		}

		if (loadedState.status === "completed") {
			return {
				structuredContent: {
					status: "already_completed",
					summary: getImportSummary(loadedState),
					message: "This import has already completed.",
				},
			};
		}

		state = loadedState;
		state.status = "running";
		console.log(`[X Import] Resuming import ${state.importId}...`);
	} else {
		// Check for existing active import
		const activeImport = getActiveImport();
		if (activeImport) {
			return {
				structuredContent: {
					status: "import_in_progress",
					importId: activeImport.importId,
					summary: getImportSummary(activeImport),
					message:
						"An import is already in progress. Use resumeImportId to continue it or wait for it to complete.",
				},
			};
		}

		// Get or create the target collection
		const collection = await getOrCreateCollection(collectionName);
		console.log(
			`[X Import] Using collection: "${collection.name}" (ID: ${collection.id}, created: ${collection.created})`
		);

		// Create new import state
		state = createImportState(collection.id, collection.name);

		// Pre-load existing tweet IDs for duplicate detection
		console.log("[X Import] Scanning for existing bookmarks...");
		const existingIds = await loadExistingTweetIds(collection.id);
		state.processedTweetIds = existingIds;
		console.log(`[X Import] Found ${existingIds.length} existing X.com bookmarks`);
	}

	// Save initial state
	saveImportState(state);

	try {
		// Get the current X.com user
		const xUser = await getCurrentXUser();
		console.log(`[X Import] Fetching bookmarks for @${xUser.username}...`);

		let paginationToken = state.nextPaginationToken;
		let totalProcessed = 0;

		// Main fetch loop
		while (true) {
			// Fetch a page of bookmarks
			const response = await fetchBookmarks({
				userId: xUser.id,
				maxResults: 100,
				paginationToken,
			});

			// Check if we got any data
			if (!response.data || response.data.length === 0) {
				console.log("[X Import] No more bookmarks to fetch");
				break;
			}

			state.totalFetched += response.data.length;

			// Build lookup maps for users and media
			const usersMap = new Map<string, XUser>();
			const mediaMap = new Map<string, XMedia>();

			if (response.includes?.users) {
				for (const user of response.includes.users) {
					usersMap.set(user.id, user);
				}
			}

			if (response.includes?.media) {
				for (const media of response.includes.media) {
					mediaMap.set(media.media_key, media);
				}
			}

			// Process the tweets
			const result = await processTweetBatch(
				response.data,
				usersMap,
				mediaMap,
				state
			);

			state.totalSaved += result.saved;
			state.totalSkipped += result.skipped;
			// totalFailed is updated by addImportError

			totalProcessed += response.data.length;

			// Update pagination token for resume
			state.nextPaginationToken = response.meta.next_token;

			// Save state after each page
			saveImportState(state);

			// Log progress
			console.log(
				`[X Import] Progress: ${state.totalFetched} fetched, ${state.totalSaved} saved, ${state.totalSkipped} skipped, ${state.totalFailed} failed`
			);

			// Check if we've hit the limit
			if (maxResults && totalProcessed >= maxResults) {
				console.log(`[X Import] Reached maxResults limit (${maxResults})`);
				break;
			}

			// Check if there are more pages
			if (!response.meta.next_token) {
				console.log("[X Import] Reached end of bookmarks");
				break;
			}

			paginationToken = response.meta.next_token;
		}

		// Mark as completed
		state.status = "completed";
		state.nextPaginationToken = undefined;
		saveImportState(state);

		const summary = getImportSummary(state);

		return {
			structuredContent: {
				status: "completed",
				importId: state.importId,
				collection: {
					id: state.collectionId,
					name: state.collectionName,
				},
				summary,
				message: `Successfully imported ${state.totalSaved} bookmarks to "${state.collectionName}"`,
			},
		};
	} catch (error) {
		// Mark as failed but preserve state for resume
		state.status = "failed";
		saveImportState(state);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		return {
			structuredContent: {
				status: "failed",
				importId: state.importId,
				error: errorMessage,
				summary: getImportSummary(state),
				message: `Import failed: ${errorMessage}. You can resume with resumeImportId="${state.importId}"`,
			},
		};
	}
}
