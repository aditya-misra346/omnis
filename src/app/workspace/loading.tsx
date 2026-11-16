import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function WorkspaceLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="OMNIS • SAVED INTELLIGENCE WORKSPACE"
      layout="report"
    />
  );
}
