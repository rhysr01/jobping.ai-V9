"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMapProjection } from "@/hooks/useMapProjection";
import { TIMING } from "@/lib/constants";

const OFFSET: Record<string, { dx: number; dy: number }> = {
  London: { dx: 6, dy: 4 },
  Manchester: { dx: -12, dy: -10 },
  Birmingham: { dx: 8, dy: -10 },
  Belfast: { dx: -12, dy: 6 },
  Dublin: { dx: 8, dy: -4 },
  Brussels: { dx: -6, dy: 4 },
  Amsterdam: { dx: 6, dy: -2 },
  Paris: { dx: -3, dy: 3 },
  Zurich: { dx: 3, dy: -3 },
  Hamburg: { dx: -3, dy: -2 },
};

// Special offsets when both Dublin and Belfast are selected (prevent overlap)
const OVERLAP_OFFSETS: Record<string, { dx: number; dy: number }> = {
  Belfast: { dx: -18, dy: 10 }, // Move Belfast further left and down
  Dublin: { dx: 14, dy: -8 }, // Move Dublin further right and up
};

type CityCoordinate = {
  lat: number;
  lon: number;
  country: string;
};

type ProjectedCity = CityCoordinate & { x: number; y: number };

const CITY_COORDINATES: Record<string, CityCoordinate> = {
  Dublin: { lat: 53.3498, lon: -6.2603, country: "Ireland" },
  Belfast: { lat: 54.5973, lon: -5.9301, country: "Ireland" },
  London: { lat: 51.5074, lon: -0.1278, country: "United Kingdom" },
  Manchester: { lat: 53.4808, lon: -2.2426, country: "United Kingdom" },
  Birmingham: { lat: 52.4862, lon: -1.8904, country: "United Kingdom" },
  Paris: { lat: 48.8566, lon: 2.3522, country: "France" },
  Amsterdam: { lat: 52.3676, lon: 4.9041, country: "Netherlands" },
  Brussels: { lat: 50.8503, lon: 4.3517, country: "Belgium" },
  Berlin: { lat: 52.52, lon: 13.405, country: "Germany" },
  Hamburg: { lat: 53.5511, lon: 9.9937, country: "Germany" },
  Munich: { lat: 48.1351, lon: 11.582, country: "Germany" },
  Zurich: { lat: 47.3769, lon: 8.5417, country: "Switzerland" },
  Madrid: { lat: 40.4168, lon: -3.7038, country: "Spain" },
  Barcelona: { lat: 41.3851, lon: 2.1734, country: "Spain" },
  Milan: { lat: 45.4642, lon: 9.19, country: "Italy" },
  Rome: { lat: 41.9028, lon: 12.4964, country: "Italy" },
  Stockholm: { lat: 59.3293, lon: 18.0686, country: "Sweden" },
  Copenhagen: { lat: 55.6761, lon: 12.5683, country: "Denmark" },
  Vienna: { lat: 48.2082, lon: 16.3738, country: "Austria" },
  Prague: { lat: 50.0755, lon: 14.4378, country: "Czech Republic" },
  Warsaw: { lat: 52.2297, lon: 21.0122, country: "Poland" },
};

interface EuropeMapProps {
  selectedCities: string[];
  onCityClick: (city: string) => void;
  maxSelections?: number;
  className?: string;
  onMaxSelectionsReached?: (city: string, max: number) => void;
}

interface TooltipState {
  city: string;
  x: number;
  y: number;
}

const EuropeMap = memo(
  function EuropeMap({
    selectedCities,
    onCityClick,
    maxSelections = 3,
    className = "",
    onMaxSelectionsReached,
  }: EuropeMapProps) {
    const { project } = useMapProjection();
    const [hoveredCity, setHoveredCity] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [focusedCity, setFocusedCity] = useState<string | null>(null);
    const [justSelected, setJustSelected] = useState<string | null>(null);
    const [shakeCity, setShakeCity] = useState<string | null>(null);
    const [touchedCity, setTouchedCity] = useState<string | null>(null);
    const prevSelectedRef = useRef<string[]>([]);
    const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const nestedTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // CRITICAL FIX: Separate ref for nested timeout
    const cityRefs = useRef<Map<string, SVGCircleElement>>(new Map());
    const [supportsHover, setSupportsHover] = useState(false);

    // Detect if device supports hover (prevents sticky hover on mobile)
    useEffect(() => {
      const mediaQuery = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      );
      setSupportsHover(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setSupportsHover(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    // Track when cities are selected to trigger highlight animation
    useEffect(() => {
      const newlySelected = selectedCities.find(
        (city) => !prevSelectedRef.current.includes(city),
      );
      if (newlySelected) {
        setJustSelected(newlySelected);
        const timer = setTimeout(
          () => setJustSelected(null),
          TIMING.MAP_SELECTION_HIGHLIGHT_MS,
        );
        prevSelectedRef.current = selectedCities;
        return () => clearTimeout(timer);
      }
      prevSelectedRef.current = selectedCities;
      return undefined;
    }, [selectedCities]);

    useEffect(() => {
      return () => {
        if (shakeTimeoutRef.current) {
          clearTimeout(shakeTimeoutRef.current);
        }
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
        // CRITICAL FIX: Clean up nested timeout separately to prevent memory leaks
        if (nestedTouchTimeoutRef.current) {
          clearTimeout(nestedTouchTimeoutRef.current);
        }
      };
    }, []);

    const handleCityClick = useCallback(
      (city: string) => {
        if (selectedCities.includes(city)) {
          onCityClick(city);
        } else if (selectedCities.length < maxSelections) {
          onCityClick(city);
        }
      },
      [selectedCities, maxSelections, onCityClick],
    );

    const triggerShake = useCallback(
      (city: string) => {
        setShakeCity(city);
        if (shakeTimeoutRef.current) {
          clearTimeout(shakeTimeoutRef.current);
        }
        shakeTimeoutRef.current = setTimeout(
          () => setShakeCity(null),
          TIMING.MAP_SHAKE_DURATION_MS,
        );

        // Call the callback if provided
        if (onMaxSelectionsReached) {
          onMaxSelectionsReached(city, maxSelections);
        }
      },
      [onMaxSelectionsReached, maxSelections],
    );

    const updateTooltip = useCallback(
      (city: string, element: SVGCircleElement) => {
        const rect = element.getBoundingClientRect();
        const svg = element.closest("svg");
        if (svg) {
          const svgRect = svg.getBoundingClientRect();
          const xRaw = rect.left + rect.width / 2 - svgRect.left;
          const yRaw = rect.top - svgRect.top - 10;
          const xClamped = Math.max(12, Math.min(svgRect.width - 12, xRaw));
          const yClamped = Math.max(12, Math.min(svgRect.height - 12, yRaw));
          setTooltip({
            city,
            x: xClamped,
            y: yClamped,
          });
        }
      },
      [],
    );

    const handleCityHover = useCallback(
      (city: string, event: React.MouseEvent<SVGCircleElement>) => {
        setHoveredCity(city);
        updateTooltip(city, event.currentTarget);
      },
      [updateTooltip],
    );

    const handleCityTouch = useCallback(
      (city: string, event: React.TouchEvent<SVGCircleElement>) => {
        // Prevent double-tap zoom on mobile
        event.preventDefault();
        setTouchedCity(city);
        setHoveredCity(city);
        updateTooltip(city, event.currentTarget);

        // Clear touch state after a delay
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
        // CRITICAL FIX: Clean up nested timeout separately
        if (nestedTouchTimeoutRef.current) {
          clearTimeout(nestedTouchTimeoutRef.current);
        }
        touchTimeoutRef.current = setTimeout(() => {
          setTouchedCity(null);
          // Keep tooltip visible for a bit longer on touch
          // CRITICAL FIX: Store nested timeout in separate ref for proper cleanup
          nestedTouchTimeoutRef.current = setTimeout(() => {
            setHoveredCity((prev) => (prev === city ? null : prev));
            setTooltip((prev) => (prev?.city === city ? null : prev));
          }, TIMING.MAP_TOOLTIP_DELAY_MS);
        }, 300);
      },
      [updateTooltip],
    );

    const handleCityLeave = useCallback(() => {
      setHoveredCity(null);
      setTooltip(null);
    }, []);

    // Declare isCitySelected before handleKeyDown to avoid "used before declaration" error
    const isCitySelected = useCallback(
      (city: string) => selectedCities.includes(city),
      [selectedCities],
    );
    const isCityDisabled = useCallback(
      (city: string) =>
        !isCitySelected(city) && selectedCities.length >= maxSelections,
      [isCitySelected, selectedCities.length, maxSelections],
    );

    const handleKeyDown = useCallback(
      (city: string, event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCityClick(city);
        } else if (event.key.startsWith("Arrow")) {
          // Arrow key navigation between cities
          event.preventDefault();
          const cityList = Object.keys(CITY_COORDINATES);
          const currentIndex = cityList.indexOf(city);
          let nextIndex = currentIndex;

          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % cityList.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + cityList.length) % cityList.length;
          }

          const nextCity = cityList[nextIndex];
          const nextElement = cityRefs.current.get(nextCity);
          const isDisabled =
            !isCitySelected(nextCity) && selectedCities.length >= maxSelections;
          if (nextElement && !isDisabled) {
            nextElement.focus();
            setFocusedCity(nextCity);
            // Show tooltip for focused city
            updateTooltip(nextCity, nextElement);
          }
        }
      },
      [
        handleCityClick,
        updateTooltip,
        isCitySelected,
        selectedCities.length,
        maxSelections,
      ],
    );

    const cityEntries = useMemo<[string, ProjectedCity][]>(() => {
      // Check if both Dublin and Belfast are selected
      const bothSelected =
        selectedCities.includes("Dublin") && selectedCities.includes("Belfast");

      return Object.entries(CITY_COORDINATES).map(([name, city]) => {
        const { x, y } = project(city.lat, city.lon);
        // Use overlap offsets if both Dublin and Belfast are selected
        const offset =
          bothSelected && OVERLAP_OFFSETS[name]
            ? OVERLAP_OFFSETS[name]
            : (OFFSET[name] ?? { dx: 0, dy: 0 });
        return [name, { ...city, x: x + offset.dx, y: y + offset.dy }];
      });
    }, [project, selectedCities]);

    // Pre-calculate selected city label positions (static, only recalculates when selection changes)
    const selectedLabelPositions = useMemo(() => {
      const positions: Map<string, { x: number; y: number }> = new Map();

      selectedCities.forEach((city) => {
        const coords = cityEntries.find(([name]) => name === city)?.[1];
        if (!coords) return;

        // coords already has the offset applied from cityEntries, so just position the label
        positions.set(city, {
          x: coords.x,
          y: coords.y - 32, // Base Y for selected (label above marker)
        });
      });

      return positions;
    }, [selectedCities, cityEntries]);

    // Calculate hover label position (only when hovering, simple calculation)
    const hoverLabelPosition = useMemo(() => {
      if (!hoveredCity || selectedCities.includes(hoveredCity)) return null;

      const coords = cityEntries.find(([name]) => name === hoveredCity)?.[1];
      if (!coords) return null;

      // coords already has the offset applied from cityEntries
      return {
        city: hoveredCity,
        x: coords.x,
        y: coords.y - 26, // Base Y for hover (label above marker)
      };
    }, [hoveredCity, selectedCities, cityEntries]);

    // Calculate focused/touched label position (similar to hover)
    const focusedLabelPosition = useMemo(() => {
      const city = focusedCity || touchedCity;
      if (!city || selectedCities.includes(city)) return null;

      const coords = cityEntries.find(([name]) => name === city)?.[1];
      if (!coords) return null;

      // coords already has the offset applied from cityEntries
      return {
        city,
        x: coords.x,
        y: coords.y - 26, // Base Y for focused (label above marker)
      };
    }, [focusedCity, touchedCity, selectedCities, cityEntries]);

    return (
      <div
        className={`relative w-full h-full min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[600px] rounded-2xl border-2 border-brand-500/30 overflow-hidden shadow-[0_0_60px_rgba(109,90,143,0.12),inset_0_0_100px_rgba(109,90,143,0.04)] touch-manipulation ${className}`}
        role="img"
        aria-label="Map of Europe showing available cities"
        aria-describedby="map-instructions"
      >
        {/* Skip link for keyboard users */}
        <a
          href="#form-submit"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
          Skip to form submission
        </a>
        {/* Enhanced multi-layer background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,theme(colors.brand.700/0.18),transparent_70%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(30%_30%_at_20%_80%,theme(colors.brand.500/0.12),transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(40%_40%_at_80%_20%,theme(colors.brand.300/0.10),transparent_60%)]"
          aria-hidden="true"
        />

        {/* Subtle grid overlay for depth */}
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"
          aria-hidden="true"
        />

        {/* Europe Map SVG */}
        <svg
          viewBox="0 0 1000 800"
          className="w-full h-auto relative z-10"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Map of Europe showing available cities"
          style={{ aspectRatio: "5/4" }}
          role="img"
        >
          {/* Hidden instructions for screen readers */}
          <text id="map-instructions" className="sr-only">
            Use arrow keys to navigate between cities. Press Enter or Space to
            select. Maximum {maxSelections} cities can be selected.
          </text>
          <defs>
            {/* Enhanced glow filter */}
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur
                stdDeviation="3"
                result="coloredBlur"
                in="SourceGraphic"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stronger glow for selected cities */}
            <filter
              id="selectedGlow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Enhanced gradient for selected cities */}
            <linearGradient
              id="selectedGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#D4C5FF" />
              <stop offset="30%" stopColor="#C9B6FF" />
              <stop offset="60%" stopColor="#A58BFF" />
              <stop offset="100%" stopColor="#8B6FFF" />
            </linearGradient>

            {/* Hover gradient */}
            <linearGradient
              id="hoverGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#E6D9FF" />
              <stop offset="100%" stopColor="#C2A8FF" />
            </linearGradient>
          </defs>

          {/* Detailed Europe outline with country borders - enhanced */}
          <image
            href="/maps/europe-borders-lite.svg"
            x={0}
            y={0}
            width={1000}
            height={800}
            opacity="0.92"
            style={{
              filter: "drop-shadow(0 0 2px rgba(99,102,241,0.2))",
            }}
          />

          {/* City markers */}
          <g
            aria-label={`City Selection (Multi-select, up to ${maxSelections} cities)`}
            aria-describedby="city-selection-help"
          >
            <text id="city-selection-help" className="sr-only">
              Select up to {maxSelections} cities by clicking on the map markers
              or using keyboard navigation.
            </text>
            {cityEntries.map(([city, coords]) => {
              const selected = isCitySelected(city);
              const disabled = isCityDisabled(city);
              const hovered = hoveredCity === city;
              const focused = focusedCity === city;
              const touched = touchedCity === city;
              const showLabel = selected || hovered || focused || touched;

              // Use pre-calculated or dynamic label position
              let labelY: number;
              let labelX: number;

              if (selected) {
                const pos = selectedLabelPositions.get(city);
                labelY = pos?.y ?? coords.y - 32;
                labelX = pos?.x ?? coords.x;
              } else if (hovered && hoverLabelPosition?.city === city) {
                labelY = hoverLabelPosition.y;
                labelX = hoverLabelPosition.x;
              } else if (
                (focused || touched) &&
                focusedLabelPosition?.city === city
              ) {
                labelY = focusedLabelPosition.y;
                labelX = focusedLabelPosition.x;
              } else {
                labelY = coords.y - 26;
                labelX = coords.x;
              }

              return (
                <g key={city} aria-label={`${city}, ${coords.country}`}>
                  {/* Invisible larger touch target (44x44px) for better mobile accessibility */}
                  {/* SEMANTIC HTML FIX: Circle with onClick needs role="button" and keyboard handlers */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r="22"
                    fill="transparent"
                    stroke="transparent"
                    className="pointer-events-auto touch-manipulation"
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Select ${city}, ${coords.country}`}
                    aria-describedby={`city-label-${city.replace(/\s+/g, "-")}`}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        triggerShake(city);
                      } else {
                        handleCityClick(city);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!disabled) {
                          handleCityClick(city);
                        }
                      }
                    }}
                    onTouchStart={(e) => !disabled && handleCityTouch(city, e)}
                  />

                  {/* Enhanced multi-layer pulsing glow for selected cities */}
                  {selected && (
                    <>
                      {/* Outer glow ring - larger pulse with enhanced visibility */}
                      <motion.circle
                        cx={coords.x}
                        cy={coords.y}
                        r="20"
                        fill="url(#selectedGradient)"
                        opacity={justSelected === city ? 0.25 : 0.12}
                        className="pointer-events-none"
                        filter="url(#selectedGlow)"
                        aria-hidden="true"
                        style={{ willChange: "transform, opacity" }}
                        initial={
                          justSelected === city
                            ? { scale: 0.8, opacity: 0 }
                            : false
                        }
                        animate={
                          justSelected === city
                            ? {
                                scale: [0.8, 1.2, 1],
                                opacity: [0.35, 0.25, 0.12],
                              }
                            : {
                                scale: [1, 1.1, 1],
                                opacity: [0.12, 0.15, 0.12],
                              }
                        }
                        transition={{
                          duration: justSelected === city ? 0.7 : 3,
                          ease: "easeOut",
                          repeat: justSelected === city ? 0 : Infinity,
                        }}
                      />
                      {/* Middle glow ring */}
                      <motion.circle
                        cx={coords.x}
                        cy={coords.y}
                        r="15"
                        fill="url(#selectedGradient)"
                        opacity="0.15"
                        className="pointer-events-none"
                        aria-hidden="true"
                        style={{ willChange: "transform, opacity" }}
                        animate={{
                          scale: [1, 1.08, 1],
                          opacity: [0.15, 0.18, 0.15],
                        }}
                        transition={{
                          duration: 2.5,
                          ease: "easeInOut",
                          repeat: Infinity,
                          delay: 0.4,
                        }}
                      />
                      {/* Inner glow ring */}
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="11"
                        fill="url(#selectedGradient)"
                        opacity="0.2"
                        className="pointer-events-none"
                      />
                    </>
                  )}

                  {/* Enhanced touch feedback ring */}
                  {touchedCity === city && (
                    <>
                      <motion.circle
                        cx={coords.x}
                        cy={coords.y}
                        r="24"
                        fill="rgba(99, 102, 241, 0.15)"
                        stroke="rgba(168, 85, 247, 0.5)"
                        strokeWidth="2.5"
                        className="pointer-events-none"
                        aria-hidden="true"
                        initial={{ scale: 0.7, opacity: 0.7 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      <motion.circle
                        cx={coords.x}
                        cy={coords.y}
                        r="20"
                        fill="rgba(199, 182, 255, 0.2)"
                        className="pointer-events-none"
                        aria-hidden="true"
                        initial={{ scale: 0.9, opacity: 0.5 }}
                        animate={{ scale: 1.15, opacity: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                          delay: 0.1,
                        }}
                      />
                    </>
                  )}

                  {/* Enhanced city marker circle with premium styling */}
                  <motion.circle
                    ref={(el) => {
                      if (el) cityRefs.current.set(city, el);
                    }}
                    cx={coords.x}
                    cy={coords.y}
                    r={
                      selected
                        ? 12
                        : hovered || focused || touchedCity === city
                          ? 11
                          : 9.5
                    }
                    fill={
                      selected
                        ? "url(#selectedGradient)"
                        : disabled
                          ? "#3f3f46"
                          : hovered || focused || touchedCity === city
                            ? "url(#hoverGradient)"
                            : "#71717a"
                    }
                    stroke={
                      selected
                        ? "#8B6FFF"
                        : hovered || focused || touchedCity === city
                          ? "#C2A8FF"
                          : "#52525b"
                    }
                    strokeWidth={
                      selected
                        ? 4
                        : hovered || focused || touchedCity === city
                          ? 3
                          : 2
                    }
                    className={
                      disabled
                        ? "cursor-not-allowed touch-manipulation"
                        : "cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent"
                    }
                    filter={
                      selected
                        ? "url(#selectedGlow)"
                        : hovered || focused || touchedCity === city
                          ? "url(#glow)"
                          : undefined
                    }
                    style={{ willChange: "transform, opacity" }}
                    whileHover={
                      !disabled && supportsHover
                        ? { scale: 1.4, strokeWidth: 4 }
                        : {}
                    }
                    whileTap={!disabled ? { scale: 0.9 } : {}}
                    onClick={() => {
                      if (disabled) {
                        triggerShake(city);
                      } else {
                        handleCityClick(city);
                      }
                    }}
                    onMouseEnter={(e) => !disabled && handleCityHover(city, e)}
                    onMouseLeave={handleCityLeave}
                    onTouchStart={(e) => !disabled && handleCityTouch(city, e)}
                    onFocus={() => !disabled && setFocusedCity(city)}
                    onBlur={() => setFocusedCity(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!disabled) {
                          handleCityClick(city);
                        }
                      } else if (!disabled) {
                        handleKeyDown(city, e);
                      }
                    }}
                    tabIndex={disabled ? -1 : 0}
                    role="button"
                    aria-label={`${city}, ${coords.country}. ${selected ? "Selected" : disabled ? "Maximum selections reached" : "Click to select"}`}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                    initial={
                      justSelected === city ? { scale: 0.4, opacity: 0 } : false
                    }
                    animate={
                      shakeCity === city
                        ? { x: [-3, 3, -2, 2, 0], scale: selected ? 1 : 1 }
                        : justSelected === city
                          ? { scale: [0.4, 1.4, 1], opacity: [0, 1, 1], x: 0 }
                          : selected
                            ? { scale: 1, x: 0 }
                            : { x: 0 }
                    }
                    transition={
                      shakeCity === city
                        ? { duration: 0.5, ease: "easeInOut" }
                        : justSelected === city
                          ? { duration: 0.7, ease: [0.23, 1, 0.32, 1] }
                          : { duration: 0.25, ease: "easeOut" }
                    }
                  />

                  {/* Enhanced city label with premium styling */}
                  {(showLabel || touched) && (
                    <motion.text
                      id={`city-label-${city.replace(/\s+/g, "-")}`}
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fill={selected ? "#D4C5FF" : "#F3E8FF"} // Lighter, more vibrant colors
                      fontSize={selected ? "14" : "13"}
                      fontWeight={selected ? "800" : "700"}
                      className="pointer-events-none select-none"
                      aria-hidden="true"
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{
                        willChange: "transform, opacity",
                        ...(selected
                          ? {
                              filter:
                                "drop-shadow(0 0 3px rgba(255,255,255,0.4)) drop-shadow(0 0 6px rgba(168,155,184,0.25))",
                              textShadow:
                                "0 0 8px rgba(212,197,255,0.5), 0 0 4px rgba(139,111,255,0.4)",
                              paintOrder: "stroke fill",
                              stroke: "rgba(12,0,40,0.65)",
                              strokeWidth: 0.5,
                            }
                          : {
                              paintOrder: "stroke fill",
                              stroke: "rgba(8,0,32,0.55)",
                              strokeWidth: 0.4,
                              textShadow:
                                "0 0 6px rgba(243,232,255,0.3), 0 0 3px rgba(194,168,255,0.2)",
                            }),
                      }}
                    >
                      {city}
                    </motion.text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Enhanced premium tooltip */}
        <AnimatePresence>
          {tooltip && (hoveredCity || touchedCity) && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="absolute z-50 px-4 py-2.5 bg-gradient-to-br from-zinc-900/98 via-zinc-800/95 to-zinc-900/98 backdrop-blur-xl rounded-xl border-2 border-brand-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(109,90,143,0.2)] pointer-events-none touch-manipulation"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: "translateX(-50%) translateY(-100%)",
              }}
              role="tooltip"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <div className="text-white font-bold text-sm leading-tight">
                  {tooltip.city}
                </div>
                {selectedCities.includes(tooltip.city) && (
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="text-content-secondary text-xs mt-1 font-medium">
                {CITY_COORDINATES[tooltip.city]?.country}
              </div>
              {selectedCities.includes(tooltip.city) && (
                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-brand-500/30">
                  <svg
                    className="w-3 h-3 text-brand-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-brand-300 text-xs font-semibold">
                    Selected
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced premium legend */}
        <div
          className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-br from-zinc-900/90 via-zinc-800/85 to-zinc-900/90 backdrop-blur-xl rounded-xl px-5 py-3.5 sm:px-6 sm:py-4 border-2 border-brand-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_40px_rgba(109,90,143,0.08)]"
          role="status"
          aria-live="polite"
          aria-label={`${selectedCities.length} of ${maxSelections} cities selected`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div
                className="relative w-5 h-5 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 shadow-[0_0_12px_rgba(168,155,184,0.3)]"
                aria-hidden="true"
              >
                <div className="absolute inset-0 rounded-full bg-brand-400/60 animate-pulse" />
                <div
                  className="absolute inset-0 rounded-full bg-brand-300/40 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
              </div>
              <span className="font-bold text-white text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 rounded-full bg-zinc-700 border-2 border-zinc-600/60 shadow-inner"
                aria-hidden="true"
              ></div>
              <span className="text-content-secondary text-sm font-medium">
                Available
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 rounded-lg border border-brand-500/40">
            <span className="text-brand-200 font-black text-base tabular-nums">
              {selectedCities.length}
            </span>
            <span className="text-content-muted font-semibold text-sm">/</span>
            <span className="text-white font-bold text-base tabular-nums">
              {maxSelections}
            </span>
            <span className="text-content-secondary text-xs font-medium ml-1">
              selected
            </span>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if props actually changed
    return (
      prevProps.selectedCities.length === nextProps.selectedCities.length &&
      prevProps.selectedCities.every(
        (city, index) => city === nextProps.selectedCities[index],
      ) &&
      prevProps.maxSelections === nextProps.maxSelections &&
      prevProps.className === nextProps.className &&
      prevProps.onCityClick === nextProps.onCityClick &&
      prevProps.onMaxSelectionsReached === nextProps.onMaxSelectionsReached
    );
  },
);

export default EuropeMap;
