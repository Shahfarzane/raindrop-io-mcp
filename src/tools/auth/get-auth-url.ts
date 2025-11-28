import { type ToolMetadata } from "xmcp";
import { getAuthUrl, isAuthenticated } from "../../lib/auth";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "get_auth_url",
  description:
    "Get the OAuth authorization URL for Raindrop.io. Use this to start the authentication process. " +
    "After the user authorizes, they will be redirected with a code that should be passed to exchange_auth_code.",
  annotations: {
    title: "Get Auth URL",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default function getAuthUrlTool() {
  const authenticated = isAuthenticated();

  if (authenticated) {
    return "Already authenticated with Raindrop.io";
  }

  const url = getAuthUrl();

  return `Authorization URL: ${url}

Instructions:
1. Open this URL in a browser
2. Authorize the application
3. Copy the 'code' parameter from the redirect URL
4. Use exchange_auth_code with that code`;
}
