// Connecteur MCP pour Claude Cowork : https://<ton-app>.vercel.app/api/mcp/<MCP_TOKEN>
import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildServer } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(token: string) {
  const expected = process.env.MCP_TOKEN ?? "";
  if (expected.length < 24) return false; // jeton absent ou trop court : connecteur fermé
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!authorized(token)) return new Response("Not found", { status: 404 });

  // Mode « sans session » : chaque requête est traitée indépendamment (adapté à Vercel).
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildServer(new URL(req.url).origin);
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Laisse la réponse partir avant de fermer
    queueMicrotask(() => void server.close());
  }
}

export { handle as GET, handle as POST, handle as DELETE };
