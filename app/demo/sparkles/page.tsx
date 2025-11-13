import { SparklesPreview, SparklesPreviewDark, SparklesPreviewColorful } from "@/components/ui/sparkles-demo";

export default function SparklesDemoPage() {
  return (
    <div className="space-y-8">
      <SparklesPreview />
      <SparklesPreviewDark />
      <SparklesPreviewColorful />
    </div>
  );
}

