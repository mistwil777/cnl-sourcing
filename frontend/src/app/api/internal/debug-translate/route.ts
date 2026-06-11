import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const redisHost = process.env.REDIS_HOST;

  // Test Claude Haiku directement
  let claudeResult: string;
  let claudeStatus: number | null = null;
  let claudeBody = "";
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: 'Reply with exactly: {"ok": true}' }],
      }),
    });
    claudeStatus = resp.status;
    claudeBody = (await resp.text()).slice(0, 300);
    claudeResult = resp.ok ? "OK" : "ERREUR";
  } catch (e) {
    claudeResult = `EXCEPTION: ${String(e)}`;
  }

  return NextResponse.json({
    apiKey: apiKey ? `${apiKey.slice(0, 20)}...` : "MISSING",
    redisHost,
    claudeStatus,
    claudeResult,
    claudeBody,
  });
}
