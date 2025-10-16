"use client";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const items = [
    { num: 1, title: "Tell us what you want", body: "Your target city, work authorization, language skills, and role preferences. Two minutes, done." },
    { num: 2, title: "We find jobs for you", body: "We monitor 1,000+ companies daily so you don't have to. Filtering, deduplicating, and matching everything to your exact criteria." },
    { num: 3, title: "Get roles that really match you", body: "Every week, one focused email with exactly five roles that fit your profile. Read in 60 seconds." },
  ];

  return (
    <section className="py-20 sm:py-24 md:py-32 lg:py-40">
      <div className="container-page">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="h2-section text-center px-4 leading-tight"
        >
          Stop searching. Start applying.
        </motion.h2>

        <div className="mt-10 sm:mt-14 grid gap-10 sm:gap-12 md:gap-14 md:grid-cols-3 text-center">
          {items.filter(x => x && x.title).map((x, index) => (
            <motion.div 
              key={x.num} 
              className="relative px-4 py-2"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.2,
                ease: [0.23, 1, 0.32, 1]
              }}
              whileHover={{ 
                y: -8,
                transition: { duration: 0.3 }
              }}
            >
              <motion.div 
                className="number-chip mx-auto"
                whileHover={{ 
                  scale: 1.15,
                  rotate: [0, -8, 8, 0],
                  transition: { duration: 0.5 }
                }}
              >
                {x.num}
              </motion.div>
              <h3 className="mt-6 text-xl sm:text-2xl font-bold text-white">{x.title}</h3>
              <p className="mt-3 p-muted text-base sm:text-lg leading-relaxed">{x.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
