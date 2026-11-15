export async function GET(request: Request) {
  const url = new URL(request.url);
  console.info(`[OMNIS Health] Check from ${url.pathname}`);
  return Response.json({
    status: "operational",
    platform: "OMNIS — The Intelligence of Everything",
    version: "1.0.0",
    runtime: "nodejs-fluid-compute",
    timestamp: new Date().toISOString(),
    providers: [
      {
        id: "world-bank",
        name: "World Bank Open Data API (v2)",
        endpoint: "https://api.worldbank.org/v2",
        status: "operational",
        license: "CC BY 4.0",
      },
      {
        id: "rest-countries",
        name: "REST Countries Geographic Registry (v3.1)",
        endpoint: "https://restcountries.com/v3.1",
        status: "operational",
        license: "MPL 2.0",
      },
      {
        id: "openalex",
        name: "OpenAlex Global Scholarly Graph",
        endpoint: "https://api.openalex.org/works",
        status: "operational",
        license: "CC0 Public Domain",
      },
      {
        id: "wikimedia",
        name: "Wikimedia REST API v1",
        endpoint: "https://en.wikipedia.org/api/rest_v1",
        status: "operational",
        license: "CC BY-SA 4.0",
      },
    ],
  });
}
