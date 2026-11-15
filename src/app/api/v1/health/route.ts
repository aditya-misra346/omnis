import { probeUpstreamProviders } from "@/lib/providers/health";

export async function GET(request: Request) {
  const url = new URL(request.url);
  console.info(`[OMNIS Health] Check from ${url.pathname}`);
  const report = await probeUpstreamProviders();
  return Response.json(report, {
    status: report.status === "unreachable" ? 503 : 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
