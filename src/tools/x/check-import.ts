import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import {
	loadImportState,
	listImportStates,
	getImportSummary,
	deleteImportState,
} from "../../lib/x-import-state";

export const schema = {
	importId: z
		.string()
		.optional()
		.describe("Specific import ID to check. If not provided, shows most recent."),
	listAll: z
		.boolean()
		.optional()
		.default(false)
		.describe("List all import history instead of just one"),
	showErrors: z
		.boolean()
		.optional()
		.default(false)
		.describe("Include error details in the response"),
	deleteImport: z
		.string()
		.optional()
		.describe("Delete an import state by ID"),
};

export const metadata: ToolMetadata = {
	name: "check_x_import",
	description:
		"Check the status of X.com bookmark imports. Can show a specific import, list all imports, or delete import history.",
	annotations: {
		title: "Check X Import Status",
		readOnlyHint: true,
		idempotentHint: true,
	},
};

export default async function checkXImportTool({
	importId,
	listAll,
	showErrors,
	deleteImport,
}: InferSchema<typeof schema>) {
	// Handle delete request
	if (deleteImport) {
		const deleted = deleteImportState(deleteImport);
		return {
			structuredContent: {
				action: "delete",
				importId: deleteImport,
				deleted,
				message: deleted
					? `Import ${deleteImport} deleted successfully`
					: `Import ${deleteImport} not found`,
			},
		};
	}

	// List all imports
	if (listAll) {
		const allImports = listImportStates();

		if (allImports.length === 0) {
			return {
				structuredContent: {
					status: "no_imports",
					message: "No X.com bookmark imports found",
					imports: [],
				},
			};
		}

		const summaries = allImports.map((state) => getImportSummary(state));

		return {
			structuredContent: {
				status: "success",
				totalImports: allImports.length,
				imports: summaries,
			},
		};
	}

	// Get specific import or most recent
	let state;

	if (importId) {
		state = loadImportState(importId);

		if (!state) {
			return {
				structuredContent: {
					status: "not_found",
					importId,
					message: `No import found with ID: ${importId}`,
				},
			};
		}
	} else {
		// Get most recent import
		const allImports = listImportStates();

		if (allImports.length === 0) {
			return {
				structuredContent: {
					status: "no_imports",
					message: "No X.com bookmark imports found. Run import_x_bookmarks to start one.",
				},
			};
		}

		state = allImports[0]; // Already sorted by most recent first
	}

	const summary = getImportSummary(state);

	// Build response
	const response: Record<string, unknown> = {
		status: "success",
		import: {
			...summary,
			collectionId: state.collectionId,
			startedAt: new Date(state.startedAt).toISOString(),
			lastUpdateAt: new Date(state.lastUpdateAt).toISOString(),
		},
	};

	// Include errors if requested
	if (showErrors && state.errors.length > 0) {
		response.errors = state.errors.slice(0, 20).map((e) => ({
			tweetId: e.tweetId,
			error: e.error,
			timestamp: new Date(e.timestamp).toISOString(),
		}));

		if (state.errors.length > 20) {
			response.moreErrors = state.errors.length - 20;
		}
	}

	// Add helpful messages based on status
	switch (state.status) {
		case "running":
			response.message =
				"Import is currently running. Progress will be saved automatically.";
			break;
		case "paused":
			response.message = `Import is paused. Resume with: import_x_bookmarks({ resumeImportId: "${state.importId}" })`;
			break;
		case "failed":
			response.message = `Import failed. Resume with: import_x_bookmarks({ resumeImportId: "${state.importId}" })`;
			break;
		case "completed":
			response.message = `Import completed successfully! ${state.totalSaved} bookmarks saved to "${state.collectionName}"`;
			break;
	}

	return { structuredContent: response };
}
