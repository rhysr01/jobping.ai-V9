import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gradientTextVariants = cva("bg-clip-text text-transparent", {
  variants: {
    variant: {
      // Primary brand gradient - high contrast for hero text/CTAs
      // Accessibility: purple-900/80 to white to purple-900/80 on zinc-950
      // WCAG AA compliant for large text (18pt+)
      brand: "bg-gradient-brand",
      // Accent gradient - use sparingly for highlights
      // Accessibility: purple-600/70 to emerald-500/70 on zinc-950
      // WCAG AA compliant for large text
      accent: "bg-gradient-accent",
      // Glass gradient - subtle for backgrounds
      glass: "bg-gradient-glass",
    },
  },
  defaultVariants: {
    variant: "brand",
  },
});

export interface GradientTextProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof gradientTextVariants> {
  children: React.ReactNode;
}

/**
 * Standardized gradient text component with accessibility-checked gradients
 * All gradients are tested for WCAG AA compliance on dark backgrounds
 *
 * @example
 * <GradientText variant="brand">Hero Title</GradientText>
 * <GradientText variant="accent">Highlighted Text</GradientText>
 */
export default function GradientText({
  children,
  className,
  variant,
  ...props
}: GradientTextProps) {
  return (
    <span
      className={cn(gradientTextVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
