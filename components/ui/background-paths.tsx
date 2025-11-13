"use client";

import { motion } from "framer-motion";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.15 + i * 0.003,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full text-cyan-400/40" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        <title>Background Paths</title>
        <defs>
          <linearGradient id={`path-gradient-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="rgb(56, 189, 248)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(125, 211, 252)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={`url(#path-gradient-${position})`}
            strokeWidth={path.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.2 + path.id * 0.015}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0], 
              opacity: [0, 0.4 + path.id * 0.02, 0],
              pathOffset: [0, 1, 0]
            }}
            transition={{ 
              duration: 15 + path.id * 2 + Math.random() * 5, 
              repeat: Number.POSITIVE_INFINITY, 
              ease: "easeInOut",
              delay: path.id * 0.1
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({ title = "Background Paths" }: { title?: string }) {
  const words = title.split(" ");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#05010f] via-[#090018] to-[#11002c]">
      {/* Background gradient matching JobPing theme with cyan accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.12] via-cyan-500/[0.08] to-purple-600/[0.10] blur-3xl" />
      
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }} className="max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: wordIndex * 0.1 + letterIndex * 0.03, type: "spring", stiffness: 150, damping: 25 }}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-brand-300"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <div className="inline-block group relative bg-gradient-to-b from-brand-500/15 to-purple-600/15 p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border border-white/15">
            <button
              className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md bg-white/[0.08] hover:bg-white/[0.12] text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-white/15 hover:border-brand-500/40 hover:shadow-md hover:shadow-brand-500/30 inline-flex items-center justify-center"
            >
              <span className="opacity-90 group-hover:opacity-100 transition-opacity">Discover Excellence</span>
              <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

