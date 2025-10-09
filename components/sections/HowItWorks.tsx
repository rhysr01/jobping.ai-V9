"use client";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const items = [
    { num: 1, title: "Tell us what you want", body: "Your target city, work authorization, language skills, and role preferences. Two minutes, done." },
    { num: 2, title: "We do the hunting", body: "Our scrapers track job boards and company career pages across Europe daily. We filter, deduplicate, and match against your criteria." },
    { num: 3, title: "Get five roles, not five hundred", body: "Every week, one focused email with exactly five roles that fit your profile. Read it in under a minute." },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="h2-section text-center"
        >
          Stop searching. Start matching.
        </motion.h2>

        <div className="mt-12 grid gap-12 md:grid-cols-3 text-center">
          {items.map((x, index) => (
            <motion.div 
              key={x.num} 
              className="relative"
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
                className="number-chip mx-auto animate-pulseRing"
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.4 }
                }}
              >
                {x.num}
              </motion.div>
              <h3 className="mt-5 text-xl font-semibold">{x.title}</h3>
              <p className="mt-2 p-muted">{x.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
