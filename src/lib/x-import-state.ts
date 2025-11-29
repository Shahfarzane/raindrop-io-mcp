import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { XImportState, XImportStatus } from "./x-types";
import { getRaindrops } from "./raindrop-client";

const IMPORT_STATE_DIR = path.join(
	os.homedir(),
	".raindrop-mcp",
	"import-state"
);

// ============ State File Helpers ============

function ensureStateDir(): void {
	if (!fs.existsSync(IMPORT_STATE_DIR)) {
		fs.mkdirSync(IMPORT_STATE_DIR, { recursive: true });
	}
}

function getStateFilePath(importId: string): string {
	return path.join(IMPORT_STATE_DIR, `${importId}.json`);
}

// ============ Public Functions ============

/**
 * Create a new import state
 */
export function createImportState(
	collectionId: number,
	collectionName: string
): XImportState {
	const importId = `x-import-${Date.now()}`;

	return {
		importId,
		status: "running",
		startedAt: Date.now(),
		lastUpdateAt: Date.now(),
		collectionId,
		collectionName,
		totalFetched: 0,
		totalSaved: 0,
		totalSkipped: 0,
		totalFailed: 0,
		processedTweetIds: [],
		errors: [],
	};
}

/**
 * Save import state to disk
 */
export function saveImportState(state: XImportState): void {
	ensureStateDir();
	state.lastUpdateAt = Date.now();
	const filePath = getStateFilePath(state.importId);
	fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Load import state from disk
 */
export function loadImportState(importId: string): XImportState | null {
	const filePath = getStateFilePath(importId);

	if (!fs.existsSync(filePath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(content) as XImportState;
	} catch {
		return null;
	}
}

/**
 * Update import state status
 */
export function updateImportStatus(
	importId: string,
	status: XImportStatus
): void {
	const state = loadImportState(importId);
	if (state) {
		state.status = status;
		saveImportState(state);
	}
}

/**
 * Find any active (running) import
 */
export function getActiveImport(): XImportState | null {
	ensureStateDir();

	const files = fs.readdirSync(IMPORT_STATE_DIR);

	for (const file of files) {
		if (!file.endsWith(".json")) continue;

		try {
			const filePath = path.join(IMPORT_STATE_DIR, file);
			const content = fs.readFileSync(filePath, "utf-8");
			const state = JSON.parse(content) as XImportState;

			if (state.status === "running") {
				return state;
			}
		} catch {
			// Ignore invalid files
		}
	}

	return null;
}

/**
 * List all import states
 */
export function listImportStates(): XImportState[] {
	ensureStateDir();

	const files = fs.readdirSync(IMPORT_STATE_DIR);
	const states: XImportState[] = [];

	for (const file of files) {
		if (!file.endsWith(".json")) continue;

		try {
			const filePath = path.join(IMPORT_STATE_DIR, file);
			const content = fs.readFileSync(filePath, "utf-8");
			states.push(JSON.parse(content) as XImportState);
		} catch {
			// Ignore invalid files
		}
	}

	// Sort by most recent first
	return states.sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Delete an import state file
 */
export function deleteImportState(importId: string): boolean {
	const filePath = getStateFilePath(importId);

	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
		return true;
	}

	return false;
}

/**
 * Load existing tweet IDs from a Raindrop collection for duplicate detection
 * Searches for X.com URLs and extracts tweet IDs
 */
export async function loadExistingTweetIds(
	collectionId: number
): Promise<string[]> {
	const tweetIds: string[] = [];
	let page = 0;
	const perPage = 50;

	// X.com URL pattern: https://x.com/{username}/status/{tweet_id}
	// Also matches twitter.com URLs
	const tweetIdPattern = /(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/;

	while (true) {
		try {
			const response = await getRaindrops(collectionId, { page, perpage: perPage });

			for (const item of response.items) {
				const match = item.link.match(tweetIdPattern);
				if (match && match[1]) {
					tweetIds.push(match[1]);
				}
			}

			// Check if we've reached the last page
			if (response.items.length < perPage) {
				break;
			}

			page++;

			// Safety limit to prevent infinite loops
			if (page > 100) {
				console.warn(
					"[X Import] Reached page limit while scanning existing bookmarks"
				);
				break;
			}
		} catch (error) {
			console.error("[X Import] Error loading existing bookmarks:", error);
			break;
		}
	}

	return tweetIds;
}

/**
 * Check if a tweet ID has already been processed
 */
export function isTweetProcessed(state: XImportState, tweetId: string): boolean {
	return state.processedTweetIds.includes(tweetId);
}

/**
 * Mark a tweet as processed
 */
export function markTweetProcessed(state: XImportState, tweetId: string): void {
	if (!state.processedTweetIds.includes(tweetId)) {
		state.processedTweetIds.push(tweetId);
	}
}

/**
 * Add an error to the import state
 */
export function addImportError(
	state: XImportState,
	tweetId: string,
	error: string
): void {
	state.errors.push({
		tweetId,
		error,
		timestamp: Date.now(),
	});
	state.totalFailed++;
}

/**
 * Get a summary of the import state
 */
export function getImportSummary(state: XImportState): {
	importId: string;
	status: XImportStatus;
	collectionName: string;
	progress: string;
	duration: string;
	stats: {
		fetched: number;
		saved: number;
		skipped: number;
		failed: number;
	};
	errorCount: number;
} {
	const durationMs = state.lastUpdateAt - state.startedAt;
	const durationSec = Math.round(durationMs / 1000);
	const minutes = Math.floor(durationSec / 60);
	const seconds = durationSec % 60;

	const total = state.totalSaved + state.totalSkipped + state.totalFailed;
	const progressPct = state.totalFetched > 0
		? Math.round((total / state.totalFetched) * 100)
		: 0;

	return {
		importId: state.importId,
		status: state.status,
		collectionName: state.collectionName,
		progress: `${progressPct}% (${total}/${state.totalFetched})`,
		duration: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
		stats: {
			fetched: state.totalFetched,
			saved: state.totalSaved,
			skipped: state.totalSkipped,
			failed: state.totalFailed,
		},
		errorCount: state.errors.length,
	};
}
