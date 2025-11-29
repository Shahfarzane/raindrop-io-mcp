import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import {
	isXAuthenticated,
	startXAuthFlow,
	getXAuthUrl,
	clearXTokens,
} from "../../lib/x-auth";
import { getCurrentXUser } from "../../lib/x-client";

export const schema = {
	logout: z
		.boolean()
		.optional()
		.default(false)
		.describe("Set to true to log out and clear X.com tokens"),
};

export const metadata: ToolMetadata = {
	name: "x_authenticate",
	description:
		"Authenticate with X.com (Twitter) to access bookmarks. Opens browser for OAuth authorization. Use logout=true to clear existing authentication.",
	annotations: {
		title: "X.com Authenticate",
		readOnlyHint: false,
		idempotentHint: false,
	},
};

export default async function xAuthenticateTool({
	logout,
}: InferSchema<typeof schema>) {
	// Handle logout
	if (logout) {
		clearXTokens();
		return {
			structuredContent: {
				status: "logged_out",
				message: "X.com authentication cleared. You will need to re-authenticate to use X.com features.",
			},
		};
	}

	// Check if already authenticated
	if (isXAuthenticated()) {
		try {
			// Verify the token still works by fetching user info
			const user = await getCurrentXUser();
			return {
				structuredContent: {
					status: "already_authenticated",
					user: {
						id: user.id,
						username: user.username,
						name: user.name,
					},
					message: `Already authenticated as @${user.username}. Use logout=true to sign out.`,
				},
			};
		} catch {
			// Token might be invalid, clear and re-authenticate
			clearXTokens();
		}
	}

	// Start the OAuth flow
	try {
		const result = await startXAuthFlow();

		// Get user info after successful auth
		const user = await getCurrentXUser();

		return {
			structuredContent: {
				status: "authenticated",
				user: {
					id: user.id,
					username: user.username,
					name: user.name,
				},
				message: result,
			},
		};
	} catch (error) {
		// If auth flow fails, provide the URL for manual authentication
		const authUrl = getXAuthUrl();

		return {
			structuredContent: {
				status: "auth_required",
				authUrl,
				error: error instanceof Error ? error.message : "Authentication failed",
				instructions: [
					"1. Open the authUrl in your browser",
					"2. Log in to X.com and authorize the application",
					"3. You will be redirected back automatically",
					"4. If automatic redirect fails, try running this tool again",
				],
			},
		};
	}
}
