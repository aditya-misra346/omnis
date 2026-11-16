"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function ResearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OmnisModuleErrorFallback moduleName="Deep Research" error={error} reset={reset} />;
}
