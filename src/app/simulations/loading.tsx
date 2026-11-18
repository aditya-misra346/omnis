import { OmnisRouteLoadingSkeleton } from "@/components/ui/OmnisPrimitives";

export default function SimulationsLoading() {
  return (
    <OmnisRouteLoadingSkeleton
      moduleTag="What-If Simulations"
      layout="split-workbench"
    />
  );
}
