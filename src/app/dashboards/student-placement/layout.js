import PlacementErrorBoundary from "@/components/shared/placement/PlacementErrorBoundary";

export default function StudentPlacementLayout({ children }) {
  return (
    <PlacementErrorBoundary>
      {children}
    </PlacementErrorBoundary>
  );
}
