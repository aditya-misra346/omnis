"use client";

import { OmnisModuleErrorFallback } from "@/components/ui/OmnisPrimitives";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OmnisModuleErrorFallback moduleName="Workspace Settings" error={error} reset={reset} />;
}
