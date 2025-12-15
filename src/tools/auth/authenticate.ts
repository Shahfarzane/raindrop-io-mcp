import type { ToolMetadata } from "xmcp";

import { getAuthUrl, getCallbackPort, isAuthenticated, startAuthFlow } from "../../lib/auth";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "authenticate",
  description:
    "Authenticate with Raindrop.io. This starts a local callback server, provides you with the OAuth URL to open in a browser, " +
    "and automatically captures the authorization code when the user authorizes. " +
    "The tool will wait up to 2 minutes for the user to complete authorization.",
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

  const authUrl = getAuthUrl();
  const port = getCallbackPort();

  // Start the auth flow (this will wait for the callback)
  const authPromise = startAuthFlow(120000);

  // Return instructions immediately - the tool will complete when auth is done
  // Actually, we need to wait for the auth to complete
  // Let's return the URL and tell the user we're waiting

  console.log(`\n🔐 Opening callback server on port ${port}...`);
  console.log(`\n📎 Please open this URL in your browser to authorize:\n\n${authUrl}\n`);
  console.log(`⏳ Waiting for authorization (up to 2 minutes)...\n`);

  try {
    const result = await authPromise;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Authentication failed: ${message}`);
  }
}
