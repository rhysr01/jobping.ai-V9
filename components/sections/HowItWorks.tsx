"use client";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const items = [
    { num: 1, title: "Set your profile", body: "City, work rights, languages, interests. Takes 2 minutes." },
    { num: 2, title: "We cut the noise", body: "New listings are screened, de-duped, quality-checked." },
    { num: 3, title: "You get five", body: "A one-minute email with only the best fits every week." },
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
          From setup to inbox in minutes
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-2 text-center p-muted"
        >
          We handle the noise so you can focus on applications that matter.
        </motion.p>

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
