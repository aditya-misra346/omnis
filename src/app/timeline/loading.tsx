import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function TimelineLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="World Timeline"
      layout="split-workbench"
    />
  );
}
