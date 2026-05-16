export async function generateWithClaude(
  prompt: string,
): Promise<{ content: string } | { error: string }> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? `Request failed (${res.status})` };
    }

    return { content: data.content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { error: msg };
  }
}
