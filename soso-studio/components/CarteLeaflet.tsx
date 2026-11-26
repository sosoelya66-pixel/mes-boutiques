"use client";

// Carte de Lille (fond sombre CARTO / OpenStreetMap, gratuit) avec un point par commerce.
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { LILLE } from "@/lib/lille";
import { SITE_ETATS, statutInfo, type Prospect } from "@/lib/types";

export const couleurPoint = (p: Prospect) => (p.statut === "nouveau" ? SITE_ETATS[p.site_etat].color : statutInfo(p.statut).color);

function Recentrer({ cible }: { cible: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (cible) map.flyTo(cible, Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [cible, map]);
  return null;
}

export default function CarteLeaflet({
  points,
  selected,
  onSelect,
  cible,
}: {
  points: Prospect[];
  selected: string | null;
  onSelect: (id: string) => void;
  cible: [number, number] | null;
}) {
  return (
    <MapContainer center={[LILLE.lat, LILLE.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <Recentrer cible={cible} />
      {points.map((p) => {
        const sel = p.id === selected;
        const c = couleurPoint(p);
        return (
          <CircleMarker
            key={p.id + (sel ? "-sel" : "")}
            center={[p.lat!, p.lng!]}
            radius={sel ? 10 : 6}
            pathOptions={{
              // Contour clair = commerce déjà dans ton suivi
              color: sel || p.statut !== "nouveau" ? "#fff" : c,
              weight: sel ? 2.5 : p.statut !== "nouveau" ? 1.5 : 1,
              fillColor: c,
              fillOpacity: sel ? 1 : 0.8,
            }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {p.nom}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
