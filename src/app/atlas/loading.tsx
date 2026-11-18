import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function AtlasLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="World Atlas"
      layout="split-map"
    />
  );
}
