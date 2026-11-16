import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function CommandLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="OMNIS • INTELLIGENCE COMMAND CENTER"
      layout="split-workbench"
    />
  );
}
