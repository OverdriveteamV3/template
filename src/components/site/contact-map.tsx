"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type ExpressionSpecification, type FilterSpecification, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/locale";
import type { ThemeTokens } from "@/lib/theme/tokens";

const samplePin = { lng: -73.9855, lat: 40.758 };

const line: string[] = ["LineString", "MultiLineString"];
function roadName(locale: Locale): ExpressionSpecification {
  return locale === "es" ? ["coalesce", ["get", "name:es"], ["get", "name"], ["get", "name:en"]] : ["coalesce", ["get", "name:en"], ["get", "name"]];
}
const majorRoad: string[] = ["motorway", "trunk", "primary", "secondary", "tertiary"];
const roads = ["match", ["geometry-type"], line, true, false] as FilterSpecification;
const major = ["all", roads, ["match", ["get", "class"], majorRoad, true, false]] as FilterSpecification;
const majorNames = ["match", ["get", "class"], majorRoad, true, false] as FilterSpecification;
const minorNames = ["match", ["get", "class"], ["minor", "service", "track"], true, false] as FilterSpecification;

function width(close: number, far: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 13, far, 16, close];
}

function themedStyle(theme: ThemeTokens, locale: Locale): StyleSpecification {
  const names = roadName(locale);
  const source = "openmaptiles";
  const label = {
    "text-color": theme.foreground,
    "text-halo-color": theme.surface,
    "text-halo-width": 1.2,
  } as const;
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: { [source]: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    layers: [
      { id: "background", type: "background", paint: { "background-color": theme.surface } },
      { id: "park", type: "fill", source, "source-layer": "park", paint: { "fill-color": theme.background } },
      { id: "landuse", type: "fill", source, "source-layer": "landuse", paint: { "fill-color": theme.background, "fill-opacity": 0.72 } },
      { id: "water", type: "fill", source, "source-layer": "water", paint: { "fill-color": theme.secondary, "fill-opacity": 0.82 } },
      { id: "waterway", type: "line", source, "source-layer": "waterway", paint: { "line-color": theme.secondary, "line-width": 1.4 } },
      { id: "building", type: "fill", source, "source-layer": "building", paint: { "fill-color": theme.border, "fill-opacity": 0.9 } },
      { id: "road-casing", type: "line", source, "source-layer": "transportation", filter: roads, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": theme.border, "line-width": width(7, 2) } },
      { id: "road", type: "line", source, "source-layer": "transportation", filter: roads, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": theme.background, "line-width": width(4.5, 1.2) } },
      { id: "road-major", type: "line", source, "source-layer": "transportation", filter: major, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": theme.primary, "line-width": width(5.5, 1.6) } },
      { id: "place", type: "symbol", source, "source-layer": "place", maxzoom: 15, layout: { "text-field": names, "text-font": ["Noto Sans Regular"], "text-size": 13 }, paint: label },
      { id: "road-name-major", type: "symbol", source, "source-layer": "transportation_name", minzoom: 13, filter: majorNames, layout: { "symbol-placement": "line", "text-field": names, "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: label },
      { id: "road-name-minor", type: "symbol", source, "source-layer": "transportation_name", minzoom: 15, filter: minorNames, layout: { "symbol-placement": "line", "text-field": names, "text-font": ["Noto Sans Regular"], "text-size": 11 }, paint: { ...label, "text-color": theme.muted } },
      { id: "housenumber", type: "symbol", source, "source-layer": "housenumber", minzoom: 16, layout: { "text-field": ["get", "housenumber"], "text-font": ["Noto Sans Regular"], "text-size": 10 }, paint: { "text-color": theme.muted, "text-halo-color": theme.background, "text-halo-width": 1 } },
    ],
  };
}

async function locate(address: string) {
  if (/example street/i.test(address)) return samplePin;
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) return samplePin;
  const rows = (await response.json()) as Array<{ lon?: string; lat?: string }>;
  const row = rows[0];
  if (!row?.lon || !row.lat) return samplePin;
  return { lng: Number(row.lon), lat: Number(row.lat) };
}

export function ContactMap({ address, name, theme }: { address: string; name: string; theme: ThemeTokens }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locale = useLocale();
  const t = useT();
  const zoomIn = t("map.zoomIn");
  const zoomOut = t("map.zoomOut");
  const resetBearing = t("map.reset");
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const signature = [theme.background, theme.surface, theme.foreground, theme.muted, theme.border, theme.primary, theme.secondary].join("|");

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    setWorkerUrl("/api/maplibre-worker");
    locate(address).then((pin) => {
      if (cancelled) return;
      const colors = themeRef.current;
      mapRef.current?.remove();
      const map = new MapLibreMap({
        container,
        center: [pin.lng, pin.lat],
        zoom: 16,
        style: themedStyle(colors, locale),
        attributionControl: { compact: true },
        locale: {
          "NavigationControl.ZoomIn": zoomIn,
          "NavigationControl.ZoomOut": zoomOut,
          "NavigationControl.ResetBearing": resetBearing,
        },
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
      const marker = document.createElement("div");
      marker.style.width = "18px";
      marker.style.height = "18px";
      marker.style.borderRadius = "999px";
      marker.style.background = colors.primary;
      marker.style.border = `3px solid ${colors.foreground}`;
      marker.style.boxShadow = `0 0 0 6px ${colors.primary}59`;
      new Marker({ element: marker }).setLngLat([pin.lng, pin.lat]).addTo(map);
      map.once("load", () => map.resize());
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [address, locale, resetBearing, signature, zoomIn, zoomOut]);

  return <div ref={ref} className="h-full min-h-[320px] w-full" role="img" aria-label={`Map of ${address || name}`} />;
}
