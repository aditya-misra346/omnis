import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function WorkspaceLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="Saved Workspace"
      layout="report"
    />
  );
}
