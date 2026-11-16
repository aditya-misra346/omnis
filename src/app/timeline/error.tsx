"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function TimelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OmnisModuleErrorFallback moduleName="Historical Timeline" error={error} reset={reset} />;
}
