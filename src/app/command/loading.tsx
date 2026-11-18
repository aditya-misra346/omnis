import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function CommandLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="Home"
      layout="split-workbench"
    />
  );
}
