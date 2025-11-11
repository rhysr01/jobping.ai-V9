'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Projection bounds control the visible portion of Europe
const BOUNDS = { lonMin: -11, lonMax: 31, latMin: 35, latMax: 71 };
const VIEW = { w: 1000, h: 800 };

const project = (lat: number, lon: number) => {
  const x = ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * VIEW.w;
  const y = ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * VIEW.h;
  return { x, y };
};

const OFFSET: Record<string, { dx: number; dy: number }> = {
  London: { dx: 6, dy: 4 },
  Manchester: { dx: -8, dy: -6 },
  Birmingham: { dx: 2, dy: -6 },
  Brussels: { dx: -6, dy: 4 },
  Amsterdam: { dx: 6, dy: -2 },
  Paris: { dx: -3, dy: 3 },
  Zurich: { dx: 3, dy: -3 },
  Hamburg: { dx: -3, dy: -2 },
};

type CityCoordinate = {
  lat: number;
  lon: number;
  country: string;
};

type ProjectedCity = CityCoordinate & { x: number; y: number };

const CITY_COORDINATES: Record<string, CityCoordinate> = {
  'Dublin': { lat: 53.3498, lon: -6.2603, country: 'Ireland' },
  'London': { lat: 51.5074, lon: -0.1278, country: 'United Kingdom' },
  'Manchester': { lat: 53.4808, lon: -2.2426, country: 'United Kingdom' },
  'Birmingham': { lat: 52.4862, lon: -1.8904, country: 'United Kingdom' },
  'Paris': { lat: 48.8566, lon: 2.3522, country: 'France' },
  'Amsterdam': { lat: 52.3676, lon: 4.9041, country: 'Netherlands' },
  'Brussels': { lat: 50.8503, lon: 4.3517, country: 'Belgium' },
  'Berlin': { lat: 52.5200, lon: 13.4050, country: 'Germany' },
  'Hamburg': { lat: 53.5511, lon: 9.9937, country: 'Germany' },
  'Munich': { lat: 48.1351, lon: 11.5820, country: 'Germany' },
  'Zurich': { lat: 47.3769, lon: 8.5417, country: 'Switzerland' },
  'Madrid': { lat: 40.4168, lon: -3.7038, country: 'Spain' },
  'Barcelona': { lat: 41.3851, lon: 2.1734, country: 'Spain' },
  'Milan': { lat: 45.4642, lon: 9.1900, country: 'Italy' },
  'Rome': { lat: 41.9028, lon: 12.4964, country: 'Italy' },
  'Stockholm': { lat: 59.3293, lon: 18.0686, country: 'Sweden' },
  'Copenhagen': { lat: 55.6761, lon: 12.5683, country: 'Denmark' },
  'Vienna': { lat: 48.2082, lon: 16.3738, country: 'Austria' },
  'Prague': { lat: 50.0755, lon: 14.4378, country: 'Czech Republic' },
  'Warsaw': { lat: 52.2297, lon: 21.0122, country: 'Poland' },
};

interface EuropeMapProps {
  selectedCities: string[];
  onCityClick: (city: string) => void;
  maxSelections?: number;
  className?: string;
}

interface TooltipState {
  city: string;
  x: number;
  y: number;
}

export default function EuropeMap({ 
  selectedCities, 
  onCityClick, 
  maxSelections = 3,
  className = ''
}: EuropeMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [focusedCity, setFocusedCity] = useState<string | null>(null);
  const [justSelected, setJustSelected] = useState<string | null>(null);
  const [shakeCity, setShakeCity] = useState<string | null>(null);
  const prevSelectedRef = useRef<string[]>([]);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track when cities are selected to trigger highlight animation
  useEffect(() => {
    const newlySelected = selectedCities.find(city => !prevSelectedRef.current.includes(city));
    if (newlySelected) {
      setJustSelected(newlySelected);
      const timer = setTimeout(() => setJustSelected(null), 1000);
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
    };
  }, []);

  const handleCityClick = useCallback((city: string) => {
    if (selectedCities.includes(city)) {
      onCityClick(city);
    } else if (selectedCities.length < maxSelections) {
      onCityClick(city);
    }
  }, [selectedCities, maxSelections, onCityClick]);

  const triggerShake = useCallback((city: string) => {
    setShakeCity(city);
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    shakeTimeoutRef.current = setTimeout(() => setShakeCity(null), 450);
  }, []);

  const handleCityHover = useCallback((city: string, event: React.MouseEvent<SVGCircleElement>) => {
    setHoveredCity(city);
    const rect = event.currentTarget.getBoundingClientRect();
    const svg = event.currentTarget.closest('svg');
    if (svg) {
      const svgRect = svg.getBoundingClientRect();
      const xRaw = rect.left + rect.width / 2 - svgRect.left;
      const yRaw = rect.top - svgRect.top - 10;
      const xClamped = Math.max(12, Math.min(svgRect.width - 12, xRaw));
      const yClamped = Math.max(12, Math.min(svgRect.height - 12, yRaw));
      setTooltip({
        city,
        x: xClamped,
        y: yClamped
      });
    }
  }, []);

  const handleCityLeave = useCallback(() => {
    setHoveredCity(null);
    setTooltip(null);
  }, []);

  const handleKeyDown = useCallback((city: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCityClick(city);
    }
  }, [handleCityClick]);

  const isCitySelected = useCallback((city: string) => selectedCities.includes(city), [selectedCities]);
  const isCityDisabled = useCallback((city: string) => 
    !isCitySelected(city) && selectedCities.length >= maxSelections, 
    [isCitySelected, selectedCities.length, maxSelections]
  );

  const cityEntries = useMemo<[string, ProjectedCity][]>(() => {
    return Object.entries(CITY_COORDINATES).map(([name, city]) => {
      const { x, y } = project(city.lat, city.lon);
      const offset = OFFSET[name] ?? { dx: 0, dy: 0 };
      return [name, { ...city, x: x + offset.dx, y: y + offset.dy }];
    });
  }, []);

  return (
    <div 
      className={`relative w-full h-full min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[600px] rounded-2xl border border-brand-500/20 overflow-hidden shadow-glow-strong ${className}`}
      role="application"
      aria-label="Interactive Europe map for city selection"
    >
      {/* Brand-colored background gradients matching app design */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050014] via-[#070021] to-[#0D012E]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_35%_25%,rgba(154,106,255,0.08)_0%,transparent_65%)] blur-xl opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(99,102,241,0.06)_0%,transparent_65%)] blur-xl opacity-60" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(154,106,255,0.08) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(154,106,255,0.08) 0.5px, transparent 0.5px)',
          backgroundSize: '72px 72px',
          backgroundPosition: '-1px -1px',
          opacity: 0.08
        }}
        aria-hidden="true"
      />
      
      {/* Glass morphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.02] backdrop-blur-[1px]" aria-hidden="true" />
      
      {/* Europe Map SVG */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Map of Europe showing available cities"
        style={{ aspectRatio: '5/4' }}
      >
        {/* Enhanced gradients and filters matching brand */}
        <defs>
          {/* Brand-colored glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur" in="SourceGraphic"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Stronger glow for selected cities */}
          <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3.2" result="coloredBlur" in="SourceGraphic"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Animated gradient for selected cities */}
          <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9B6FF" />
            <stop offset="50%" stopColor="#A58BFF" />
            <stop offset="100%" stopColor="#7C6DFF" />
          </linearGradient>
        </defs>

        {/* Real Europe outline (behind dots) */}
        <image
          href="/maps/europe-lite.svg"
          x={0}
          y={0}
          width={VIEW.w}
          height={VIEW.h}
          opacity="0.85"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.10))' }}
          aria-hidden="true"
        />

        {/* Country borders overlay */}
        <image
          href="/maps/europe-borders-lite.svg"
          x={0}
          y={0}
          width={VIEW.w}
          height={VIEW.h}
          opacity="0.55"
          style={{ mixBlendMode: 'screen' }}
          aria-hidden="true"
        />

        {/* City markers */}
        <g aria-label="Selectable cities">
          {cityEntries.map(([city, coords]) => {
            const selected = isCitySelected(city);
            const disabled = isCityDisabled(city);
            const hovered = hoveredCity === city;
            const focused = focusedCity === city;
            const showLabel = selected || hovered || focused;
            const labelY = coords.y - (selected ? 32 : 26);

            return (
              <g key={city} aria-label={`${city}, ${coords.country}`}>
                {/* Multi-layer pulsing glow for selected cities - brand colors */}
                {selected && (
                  <>
                    {/* Outer glow ring - larger pulse */}
                    <motion.circle
                      cx={coords.x}
                      cy={coords.y}
                      r="20"
                      fill="url(#selectedGradient)"
                      opacity={justSelected === city ? 0.25 : 0.12}
                      className="animate-pulse"
                      aria-hidden="true"
                      initial={justSelected === city ? { scale: 0.8, opacity: 0 } : false}
                      animate={justSelected === city ? { 
                        scale: [0.8, 1.2, 1],
                        opacity: [0.4, 0.2, 0.12]
                      } : {}}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {/* Middle glow ring */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="16"
                      fill="url(#selectedGradient)"
                      opacity="0.25"
                      className="animate-pulse"
                      style={{ animationDelay: '0.3s' }}
                      aria-hidden="true"
                    />
                    {/* Inner glow ring */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="12"
                      fill="url(#selectedGradient)"
                      opacity="0.35"
                      className="animate-pulse"
                      style={{ animationDelay: '0.5s' }}
                      aria-hidden="true"
                    />
                  </>
                )}
                
                {/* City marker circle with brand colors - fully accessible */}
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={selected ? 11 : hovered || focused ? 10 : 9}
                  fill={selected ? 'url(#selectedGradient)' : disabled ? '#3f3f46' : hovered || focused ? '#C2A8FF' : '#71717a'}
                  stroke={selected ? '#9A6AFF' : hovered || focused ? '#C2A8FF' : '#52525b'}
                  strokeWidth={selected ? 3.5 : hovered || focused ? 2.5 : 2}
                  className={disabled ? 'cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent'}
                  filter={selected ? 'url(#glowStrong)' : hovered || focused ? 'url(#glow)' : undefined}
                  whileHover={!disabled ? { scale: 1.35, strokeWidth: 3.5 } : {}}
                  whileTap={!disabled ? { scale: 0.85 } : {}}
                  onClick={() => {
                    if (disabled) {
                      triggerShake(city);
                    } else {
                      handleCityClick(city);
                    }
                  }}
                  onMouseEnter={(e) => !disabled && handleCityHover(city, e)}
                  onMouseLeave={handleCityLeave}
                  onFocus={() => !disabled && setFocusedCity(city)}
                  onBlur={() => setFocusedCity(null)}
                  onKeyDown={(e) => !disabled && handleKeyDown(city, e)}
                  tabIndex={disabled ? -1 : 0}
                  role="button"
                  aria-label={`${city}, ${coords.country}. ${selected ? 'Selected' : disabled ? 'Maximum selections reached' : 'Click to select'}`}
                  aria-pressed={selected}
                  aria-disabled={disabled}
                  initial={justSelected === city ? { scale: 0.5, opacity: 0 } : false}
                  animate={
                    shakeCity === city
                      ? { x: [-2, 2, -1, 1, 0], scale: selected ? 1 : 1 }
                      : justSelected === city
                        ? { scale: [0.5, 1.3, 1], opacity: [0, 1, 1], x: 0 }
                        : selected
                          ? { scale: 1, x: 0 }
                          : { x: 0 }
                  }
                  transition={
                    shakeCity === city
                      ? { duration: 0.45, ease: 'easeInOut' }
                      : justSelected === city
                        ? { duration: 0.6, ease: 'easeOut' }
                        : { duration: 0.2, ease: 'easeOut' }
                  }
                  style={selected ? {
                    filter: 'drop-shadow(0 0 12px rgba(154,106,255,0.8)) drop-shadow(0 0 24px rgba(139,92,246,0.5)) drop-shadow(0 0 36px rgba(99,102,241,0.3))'
                  } : {}}
                />
                
                {/* City label appears only when relevant */}
                {showLabel && (
                  <motion.text
                    x={coords.x}
                    y={labelY}
                    textAnchor="middle"
                    fill={selected ? '#C2A8FF' : '#E6E1FF'}
                    fontSize={selected ? "13" : "12"}
                    fontWeight={selected ? '700' : '600'}
                    className="pointer-events-none select-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={selected ? {
                      filter: 'drop-shadow(0 0 4px rgba(154,106,255,0.5))',
                      textShadow: '0 0 8px rgba(154,106,255,0.4)',
                      paintOrder: 'stroke fill',
                      stroke: 'rgba(12,0,40,0.55)',
                      strokeWidth: 0.45
                    } : {
                      paintOrder: 'stroke fill',
                      stroke: 'rgba(8,0,32,0.45)',
                      strokeWidth: 0.35,
                      textShadow: '0 0 4px rgba(12,0,32,0.4)'
                    }}
                    aria-hidden="true"
                  >
                    {city}
                  </motion.text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && hoveredCity && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 px-3 py-2 bg-zinc-900/95 backdrop-blur-md rounded-lg border border-brand-500/30 shadow-glow-subtle pointer-events-none"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
            role="tooltip"
            aria-live="polite"
          >
            <div className="text-white font-semibold text-sm">{tooltip.city}</div>
            <div className="text-zinc-400 text-xs mt-0.5">
              {CITY_COORDINATES[tooltip.city]?.country}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Legend with brand styling - better spacing */}
      <div 
        className="absolute bottom-5 left-5 right-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 backdrop-blur-md rounded-xl px-6 py-4 border border-brand-500/30 shadow-glow-subtle"
        role="status"
        aria-live="polite"
        aria-label={`${selectedCities.length} of ${maxSelections} cities selected`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 shadow-glow-subtle" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-brand-500/40 animate-pulse" />
            </div>
            <span className="font-semibold text-white/90 text-sm">Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-zinc-600 border border-zinc-500/50" aria-hidden="true"></div>
            <span className="text-zinc-400 text-sm">Available</span>
          </div>
        </div>
        <div className="text-white/90 font-bold text-base">
          {selectedCities.length}/{maxSelections} selected
        </div>
      </div>
    </div>
  );
}
