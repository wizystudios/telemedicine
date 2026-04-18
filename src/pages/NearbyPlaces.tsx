import { NearbyMap } from '@/components/NearbyMap';

export default function NearbyPlaces() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-3">
        <NearbyMap />
      </div>
    </div>
  );
}
