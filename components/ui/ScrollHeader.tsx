'use client';

import { useState, useEffect } from 'react';

export default function ScrollHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!scrolled) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="container-page h-14 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">JobPing</span>
        <span className="text-sm text-zinc-300">Early-career roles delivered weekly</span>
      </div>
    </div>
  );
}

