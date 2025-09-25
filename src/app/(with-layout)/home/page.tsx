"use client";
import GoogleMap from "@/components/Map/GoogleMap";

export default function Page() {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID!;

  return (
    <div>
      <GoogleMap mapId={mapId} />
    </div>
  );
}
