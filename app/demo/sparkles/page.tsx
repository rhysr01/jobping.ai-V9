import {
  SparklesPreview,
  SparklesPreviewColorful,
  SparklesPreviewDark,
} from "@/components/ui/sparkles-demo";

export default function SparklesDemoPage() {
  return (
    <div className="space-y-8">
      <SparklesPreview />
      <SparklesPreviewDark />
      <SparklesPreviewColorful />
    </div>
  );
}
