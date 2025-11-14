import Navigation from "@/components/Navigation";
import { NetworkTouchCal } from "@/components/network/NetworkTouchCal";

export const NetworkTouchCalContent = () => (
  <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-8">
    <div className="mb-4">
      <h1 className="text-2xl sm:text-3xl font-bold">Network Touch Calendar</h1>
      <p className="text-muted-foreground mt-2">Follow-up and last conversation timeline</p>
    </div>
    <NetworkTouchCal />
  </div>
);

export default function NetworkTouchCalPage() {
  return (
    <Navigation>
      <NetworkTouchCalContent />
    </Navigation>
  );
}
