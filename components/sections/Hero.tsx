"use client";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

export default function Hero() {
  // Temporary debug: Verify component is rendering
  if (typeof window !== 'undefined') {
    console.log('✅ Hero component rendering - using HeroGeometric');
  }
  
  return <HeroGeometric />;
}
