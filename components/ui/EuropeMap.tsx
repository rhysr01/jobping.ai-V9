'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Geographic coordinates (lat/long) converted to SVG viewBox coordinates
// ViewBox: 0 0 1000 800 represents Europe approximately: 10°W-40°E, 35°N-72°N
// Conversion: x = (longitude + 10) / 50 * 1000, y = (72 - latitude) / 37 * 800
type CityCoordinate = {
  lat: number;
  lon: number;
  x: number;
  y: number;
  country: string;
  labelOffset?: {
    x?: number;
    y?: number;
    anchor?: 'start' | 'middle' | 'end';
  };
};

const CITY_COORDINATES: Record<string, CityCoordinate> = {
  'Dublin': { lat: 53.3498, lon: -6.2603, x: 175, y: 400, country: 'Ireland', labelOffset: { x: -16, y: -32, anchor: 'end' } },
  'London': { lat: 51.5074, lon: -0.1278, x: 198, y: 440, country: 'United Kingdom', labelOffset: { x: 22, y: -12, anchor: 'start' } },
  'Manchester': { lat: 53.4808, lon: -2.2426, x: 155, y: 400, country: 'United Kingdom', labelOffset: { x: -18, y: 6, anchor: 'end' } },
  'Birmingham': { lat: 52.4862, lon: -1.8904, x: 182, y: 420, country: 'United Kingdom', labelOffset: { x: 28, y: 18, anchor: 'start' } },
  'Paris': { lat: 48.8566, lon: 2.3522, x: 247, y: 500, country: 'France', labelOffset: { x: -24, y: -30, anchor: 'end' } },
  'Amsterdam': { lat: 52.3676, lon: 4.9041, x: 298, y: 425, country: 'Netherlands', labelOffset: { x: 20, y: -18, anchor: 'start' } },
  'Brussels': { lat: 50.8503, lon: 4.3517, x: 287, y: 460, country: 'Belgium', labelOffset: { x: -26, y: 18, anchor: 'end' } },
  'Berlin': { lat: 52.5200, lon: 13.4050, x: 468, y: 425, country: 'Germany', labelOffset: { x: 0, y: -28 } },
  'Hamburg': { lat: 53.5511, lon: 9.9937, x: 400, y: 400, country: 'Germany', labelOffset: { x: -32, y: -18, anchor: 'end' } },
  'Munich': { lat: 48.1351, lon: 11.5820, x: 431, y: 520, country: 'Germany', labelOffset: { x: 30, y: 12, anchor: 'start' } },
  'Zurich': { lat: 47.3769, lon: 8.5417, x: 371, y: 535, country: 'Switzerland', labelOffset: { x: -26, y: 24, anchor: 'end' } },
  'Madrid': { lat: 40.4168, lon: -3.7038, x: 126, y: 685, country: 'Spain', labelOffset: { x: 0, y: 36 } },
  'Barcelona': { lat: 41.3851, lon: 2.1734, x: 243, y: 665, country: 'Spain', labelOffset: { x: 28, y: 28, anchor: 'start' } },
  'Milan': { lat: 45.4642, lon: 9.1900, x: 384, y: 575, country: 'Italy', labelOffset: { x: 28, y: -14, anchor: 'start' } },
  'Rome': { lat: 41.9028, lon: 12.4964, x: 450, y: 655, country: 'Italy', labelOffset: { x: 0, y: 34 } },
  'Stockholm': { lat: 59.3293, lon: 18.0686, x: 562, y: 275, country: 'Sweden', labelOffset: { x: 24, y: -16, anchor: 'start' } },
  'Copenhagen': { lat: 55.6761, lon: 12.5683, x: 451, y: 355, country: 'Denmark', labelOffset: { x: -28, y: -18, anchor: 'end' } },
  'Vienna': { lat: 48.2082, lon: 16.3738, x: 528, y: 515, country: 'Austria', labelOffset: { x: 30, y: 10, anchor: 'start' } },
  'Prague': { lat: 50.0755, lon: 14.4378, x: 488, y: 475, country: 'Czech Republic', labelOffset: { x: -30, y: -14, anchor: 'end' } },
  'Warsaw': { lat: 52.2297, lon: 21.0122, x: 620, y: 430, country: 'Poland', labelOffset: { x: 28, y: -20, anchor: 'start' } },
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
  const prevSelectedRef = useRef<string[]>([]);
  
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

  const handleCityClick = useCallback((city: string) => {
    if (selectedCities.includes(city)) {
      onCityClick(city);
    } else if (selectedCities.length < maxSelections) {
      onCityClick(city);
    }
  }, [selectedCities, maxSelections, onCityClick]);

  const handleCityHover = useCallback((city: string, event: React.MouseEvent<SVGCircleElement>) => {
    setHoveredCity(city);
    const rect = event.currentTarget.getBoundingClientRect();
    const svg = event.currentTarget.closest('svg');
    if (svg) {
      const svgRect = svg.getBoundingClientRect();
      setTooltip({
        city,
        x: rect.left + rect.width / 2 - svgRect.left,
        y: rect.top - svgRect.top - 10
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

  const cityEntries = useMemo(() => Object.entries(CITY_COORDINATES), []);

  return (
    <div 
      className={`relative w-full h-full min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[600px] rounded-2xl border border-brand-500/20 overflow-hidden shadow-glow-strong ${className}`}
      role="application"
      aria-label="Interactive Europe map for city selection"
    >
      {/* Brand-colored background gradients matching app design */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060013] via-[#0a001e] to-[#120033]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(154,106,255,0.15)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(99,102,241,0.12)_0%,transparent_60%)] blur-3xl" />
      </div>
      
      {/* Enhanced grid pattern with brand colors */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '-1px -1px'
        }}
        aria-hidden="true"
      />
      
      {/* Glass morphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.02] backdrop-blur-[1px]" aria-hidden="true" />
      
      {/* Europe Map SVG */}
      <svg
        viewBox="80 140 540 520"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Map of Europe showing available cities"
        style={{ aspectRatio: '5/4' }}
      >
        {/* Enhanced gradients and filters matching brand */}
        <defs>
          {/* Country gradient with brand colors */}
          <linearGradient id="europeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A6AFF" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#6B4EFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.06" />
          </linearGradient>
          
          {/* Brand-colored glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" in="SourceGraphic"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Stronger glow for selected cities */}
          <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" in="SourceGraphic"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Animated gradient for selected cities */}
          <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A6AFF" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* Enhanced country shapes with brand-colored borders */}
        <g aria-label="European countries" transform="translate(-20, -10)">
          {/* UK & Ireland */}
          <path
            d="M 150 250 Q 180 240 200 260 Q 210 280 200 300 Q 190 320 180 310 Q 160 300 150 280 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="United Kingdom and Ireland"
          />
          
          {/* France */}
          <path
            d="M 200 300 Q 250 310 280 330 Q 270 360 250 350 Q 230 340 200 320 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="France"
          />
          
          {/* Germany */}
          <path
            d="M 280 250 Q 320 260 350 280 Q 340 320 320 340 Q 300 330 280 310 Q 270 290 280 270 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="Germany"
          />
          
          {/* Spain */}
          <path
            d="M 180 420 Q 220 430 280 450 Q 270 480 240 470 Q 200 460 180 440 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="Spain"
          />
          
          {/* Italy */}
          <path
            d="M 300 360 Q 330 380 350 400 Q 340 440 320 430 Q 310 400 300 380 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="Italy"
          />
          
          {/* Nordic countries */}
          <path
            d="M 300 180 Q 350 190 380 200 Q 370 240 350 230 Q 320 220 300 200 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="Nordic countries"
          />
          
          {/* Central/Eastern Europe */}
          <path
            d="M 320 280 Q 360 290 400 300 Q 390 340 360 330 Q 340 320 320 300 Z"
            fill="url(#europeGradient)"
            stroke="rgba(154,106,255,0.2)"
            strokeWidth="1.5"
            opacity="0.6"
            aria-label="Central and Eastern Europe"
          />
        </g>

        {/* City markers */}
        <g aria-label="Selectable cities" transform="translate(-20, -10)">
          {cityEntries.map(([city, coords]) => {
            const selected = isCitySelected(city);
            const disabled = isCityDisabled(city);
            const hovered = hoveredCity === city;
            const focused = focusedCity === city;
            const labelOffset = coords.labelOffset || {};
            const labelX = coords.x + (labelOffset.x ?? 0);
            const labelY = coords.y - (selected ? 24 : hovered || focused ? 22 : 20) + (labelOffset.y ?? 0);
            const textAnchor = labelOffset.anchor ?? 'middle';

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
                      opacity={justSelected === city ? 0.4 : 0.2}
                      className="animate-pulse"
                      aria-hidden="true"
                      initial={justSelected === city ? { scale: 0.8, opacity: 0 } : false}
                      animate={justSelected === city ? { 
                        scale: [0.8, 1.2, 1],
                        opacity: [0.6, 0.3, 0.2]
                      } : {}}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
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
                  r={selected ? 11 : hovered || focused ? 9 : 8}
                  fill={selected ? 'url(#selectedGradient)' : disabled ? '#52525b' : hovered || focused ? '#B491FF' : '#71717a'}
                  stroke={selected ? '#9A6AFF' : hovered || focused ? '#B491FF' : '#52525b'}
                  strokeWidth={selected ? 3.5 : hovered || focused ? 2.5 : 2}
                  className={disabled ? 'cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent'}
                  filter={selected ? 'url(#glowStrong)' : hovered || focused ? 'url(#glow)' : undefined}
                  whileHover={!disabled ? { scale: 1.35, strokeWidth: 3.5 } : {}}
                  whileTap={!disabled ? { scale: 0.85 } : {}}
                  onClick={() => !disabled && handleCityClick(city)}
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
                  animate={justSelected === city ? { 
                    scale: [0.5, 1.3, 1],
                    opacity: [0, 1, 1]
                  } : selected ? { scale: 1 } : {}}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={selected ? {
                    filter: 'drop-shadow(0 0 12px rgba(154,106,255,0.8)) drop-shadow(0 0 24px rgba(139,92,246,0.5)) drop-shadow(0 0 36px rgba(99,102,241,0.3))'
                  } : {}}
                />
                
                {/* City label with brand colors - improved spacing */}
                <motion.text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  fill={selected ? '#C2A8FF' : hovered || focused ? '#B491FF' : '#a1a1aa'}
                  fontSize={selected ? "13" : hovered || focused ? "12" : "11"}
                  fontWeight={selected ? '700' : hovered || focused ? '600' : '500'}
                  className="pointer-events-none select-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hovered || selected || focused ? 1 : 0.7 }}
                  transition={{ duration: 0.2 }}
                  style={selected ? {
                    filter: 'drop-shadow(0 0 4px rgba(154,106,255,0.5))',
                    textShadow: '0 0 8px rgba(154,106,255,0.4)'
                  } : {}}
                  aria-hidden="true"
                >
                  {city}
                </motion.text>
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
        className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-xs bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 backdrop-blur-md rounded-xl px-6 py-3.5 border border-brand-500/30 shadow-glow-subtle"
        role="status"
        aria-live="polite"
        aria-label={`${selectedCities.length} of ${maxSelections} cities selected`}
      >
        <div className="flex items-center gap-6">
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
