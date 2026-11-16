"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function LaboratoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OmnisModuleErrorFallback moduleName="Scientific Laboratory" error={error} reset={reset} />
  );
}
