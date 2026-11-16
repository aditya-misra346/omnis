"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function KnowledgeGraphError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OmnisModuleErrorFallback moduleName="Knowledge Graph" error={error} reset={reset} />;
}
