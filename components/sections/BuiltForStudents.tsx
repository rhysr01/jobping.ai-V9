"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import GlassCard from "@/components/ui/GlassCard";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { IconBadge } from "@/components/ui/IconBadge";
import * as Copy from "@/lib/copy";

export default function BuiltForStudents() {
  return (
    <section className="section-padding">
      <div className="container-page container-rhythm">
        <SectionHeader
          title={Copy.BUILT_FOR_STUDENTS_TITLE}
          description={Copy.BUILT_FOR_STUDENTS_SUBTITLE}
        />

        <div className="mt-10 sm:mt-12 grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-14">
          {Copy.BUILT_FOR_STUDENTS_FEATURES.filter(feature => feature && feature.title).map((feature, index) => {
            const Icon = BrandIcons.Sparkles; // Default icon, can be customized per feature
            return (
            <GlassCard
              key={feature.num}
              variant="subtle"
              hover="lift"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.15,
                ease: [0.23, 1, 0.32, 1]
              }}
                className="p-8 sm:p-10 md:p-12 relative overflow-hidden group"
            >
                <div className="flex items-center justify-between mb-4">
              <div className="number-chip">{feature.num}</div>
                  <IconBadge>
                    <Icon className="w-5 h-5 text-brand-400" />
                  </IconBadge>
                </div>
                <h3 className="mt-4 text-2xl sm:text-3xl md:text-4xl text-white font-black leading-tight">{feature.title}</h3>
                <p className="mt-4 text-lg sm:text-xl text-neutral-100 leading-relaxed font-semibold">{feature.body}</p>
            </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
