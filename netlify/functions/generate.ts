import Anthropic from "@anthropic-ai/sdk";
import type { Handler } from "@netlify/functions";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 1024;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: "AI drafting is not configured. Use 'Generate prompt' instead.",
      }),
    };
  }

  let prompt: string;
  try {
    const parsed = JSON.parse(event.body ?? "{}");
    prompt = parsed.prompt;
    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'prompt' in request body" }),
      };
    }
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const content = textBlock && "text" in textBlock ? textBlock.text : "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Claude API error:", msg);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `AI service error: ${msg}` }),
    };
  }
};
