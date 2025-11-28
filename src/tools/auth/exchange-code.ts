import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { exchangeCode } from "../../lib/auth";

export const schema = {
  code: z.string().describe("The authorization code from the OAuth callback URL"),
};

export const metadata: ToolMetadata = {
  name: "exchange_auth_code",
  description:
    "Exchange an OAuth authorization code for access tokens. " +
    "Use this after the user has authorized via the URL from get_auth_url.",
  annotations: {
    title: "Exchange Auth Code",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function exchangeAuthCode({
  code,
}: InferSchema<typeof schema>) {
  try {
    await exchangeCode(code);
    return "Authentication successful! You can now use Raindrop.io tools.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Authentication failed: ${message}`);
  }
}
