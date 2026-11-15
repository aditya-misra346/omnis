export type UpstreamProviderStatus = "operational" | "degraded" | "unreachable";

export interface ProviderHealthCheckResult {
  id: string;
  name: string;
  endpoint: string;
  status: UpstreamProviderStatus;
  httpStatus: number | null;
  latencyMs: number;
  license: string;
}

export interface PlatformHealthReport {
  status: UpstreamProviderStatus;
  platform: string;
  version: string;
  runtime: string;
  cached: boolean;
  timestamp: string;
  providers: ProviderHealthCheckResult[];
}

interface ProviderDefinition {
  id: string;
  name: string;
  endpoint: string;
  probeUrl: string;
  license: string;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "world-bank",
    name: "World Bank Open Data API (v2)",
    endpoint: "https://api.worldbank.org/v2",
    probeUrl: "https://api.worldbank.org/v2/country/IND/indicator/NY.GDP.MKTP.CD?format=json&per_page=1",
    license: "CC BY 4.0",
  },
  {
    id: "rest-countries",
    name: "REST Countries Geographic Registry (v3.1)",
    endpoint: "https://restcountries.com/v3.1",
    probeUrl: "https://restcountries.com/v3.1/alpha/IND?fields=cca3",
    license: "MPL 2.0",
  },
  {
    id: "openalex",
    name: "OpenAlex Global Scholarly Graph",
    endpoint: "https://api.openalex.org/works",
    probeUrl: "https://api.openalex.org/works?per-page=1",
    license: "CC0 Public Domain",
  },
  {
    id: "wikimedia",
    name: "Wikimedia REST API v1",
    endpoint: "https://en.wikipedia.org/api/rest_v1",
    probeUrl: "https://en.wikipedia.org/api/rest_v1/page/summary/Earth",
    license: "CC BY-SA 4.0",
  },
];

let cachedHealthReport: { report: PlatformHealthReport; expiresAt: number } | null = null;

export function clearHealthCacheForTests(): void {
  cachedHealthReport = null;
}

export async function probeUpstreamProviders(options?: {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  bypassCache?: boolean;
}): Promise<PlatformHealthReport> {
  const now = Date.now();
  if (!options?.bypassCache && cachedHealthReport && now < cachedHealthReport.expiresAt) {
    return { ...cachedHealthReport.report, cached: true };
  }

  const fetchImpl = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 2500;

  const providers = await Promise.all(
    PROVIDERS.map(async (provider): Promise<ProviderHealthCheckResult> => {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(provider.probeUrl, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "OMNIS-Health-Check/1.0",
          },
        });
        clearTimeout(timer);
        const latencyMs = Math.max(1, Date.now() - started);
        let status: UpstreamProviderStatus = res.ok
          ? "operational"
          : res.status >= 400
            ? "degraded"
            : "unreachable";

        // Detect deprecated/error JSON envelopes even when a gateway redirects to HTTP 200 JSON
        if (res.ok) {
          try {
            const payload = (await res.json()) as {
              success?: boolean;
              errors?: unknown[];
            } | null;
            if (payload && payload.success === false && Array.isArray(payload.errors)) {
              status = "degraded";
            }
          } catch {
            // Non-JSON or streamed 200 payload remains operational
          }
        }
        return {
          id: provider.id,
          name: provider.name,
          endpoint: provider.endpoint,
          status,
          httpStatus: res.status,
          latencyMs,
          license: provider.license,
        };
      } catch {
        clearTimeout(timer);
        return {
          id: provider.id,
          name: provider.name,
          endpoint: provider.endpoint,
          status: "unreachable",
          httpStatus: null,
          latencyMs: Math.max(1, Date.now() - started),
          license: provider.license,
        };
      }
    })
  );

  const opCount = providers.filter((p) => p.status === "operational").length;
  const overallStatus: UpstreamProviderStatus =
    opCount === providers.length
      ? "operational"
      : opCount > 0
        ? "degraded"
        : "unreachable";

  const report: PlatformHealthReport = {
    status: overallStatus,
    platform: "OMNIS — The Intelligence of Everything",
    version: "1.0.0",
    runtime: "nodejs-fluid-compute",
    cached: false,
    timestamp: new Date().toISOString(),
    providers,
  };

  if (!options?.bypassCache) {
    cachedHealthReport = { report, expiresAt: now + 60_000 };
  }

  return report;
}
