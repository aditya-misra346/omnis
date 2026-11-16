"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function SimulationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OmnisModuleErrorFallback moduleName="Scenario Simulations" error={error} reset={reset} />
  );
}
