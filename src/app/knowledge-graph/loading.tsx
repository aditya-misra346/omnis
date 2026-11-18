import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function KnowledgeGraphLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="Topic Map"
      layout="split-workbench"
    />
  );
}
