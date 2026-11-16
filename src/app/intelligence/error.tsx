"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function IntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OmnisModuleErrorFallback moduleName="Intelligence Comparison" error={error} reset={reset} />
  );
}
