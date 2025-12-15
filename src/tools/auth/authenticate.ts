import type { ToolMetadata } from "xmcp";

import { isAuthenticated, startAuthFlow } from "../../lib/auth";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "authenticate",
  description:
    "Authenticate with Raindrop.io. Opens your browser automatically for OAuth authorization. " +
    "The tool will wait up to 2 minutes for you to complete authorization in the browser.",
  annotations: {
    title: "Authenticate",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function authenticate() {
  if (isAuthenticated()) {
    return "Already authenticated with Raindrop.io. You can use other Raindrop tools now.";
  }

  try {
    // Start the auth flow - browser opens automatically
    const result = await startAuthFlow(120000);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Authentication failed: ${message}`);
  }
}
