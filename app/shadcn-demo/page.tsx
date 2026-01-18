import { Input } from "@/components/ui/input";
import CustomButton from "@/components/ui/CustomButton";

export default function ShadcnDemo() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">shadcn/ui Components Demo</h1>

      <div className="space-y-8">
        {/* Input Components */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Input Components</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email (shadcn/ui Input)
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name (Custom Input)
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>
          </div>
        </section>

        {/* Button Components */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Button Components</h2>

          <div className="space-y-6">
            {/* shadcn/ui Button Variants */}
            <div>
              <h3 className="text-lg font-medium mb-3">shadcn/ui Button Variants</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Import: <code className="bg-muted px-1 rounded">import {"{ Button }"} from "@/components/ui/button"</code>
              </p>
              <div className="text-sm bg-muted p-3 rounded">
                <pre>{`<Button>Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>`}</pre>
              </div>
            </div>

            {/* shadcn/ui Button Sizes */}
            <div>
              <h3 className="text-lg font-medium mb-3">shadcn/ui Button Sizes</h3>
              <div className="text-sm bg-muted p-3 rounded">
                <pre>{`<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>`}</pre>
              </div>
            </div>

            {/* Custom Button Variants */}
            <div>
              <h3 className="text-lg font-medium mb-3">Custom Button Variants</h3>
              <div className="flex flex-wrap gap-4">
                <CustomButton variant="primary">Primary</CustomButton>
                <CustomButton variant="secondary">Secondary</CustomButton>
                <CustomButton variant="ghost">Ghost</CustomButton>
                <CustomButton variant="secondary">Secondary</CustomButton>
                <CustomButton variant="primary">Primary</CustomButton>
              </div>
            </div>

            {/* Custom Button Sizes */}
            <div>
              <h3 className="text-lg font-medium mb-3">Custom Button Sizes</h3>
              <div className="flex items-center gap-4">
                <CustomButton variant="primary" size="sm">Small</CustomButton>
                <CustomButton variant="primary" size="md">Medium</CustomButton>
                <CustomButton variant="primary" size="lg">Large</CustomButton>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Comparison */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Usage Comparison</h2>
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">shadcn/ui Button:</h3>
            <pre className="text-sm bg-background p-2 rounded border overflow-x-auto">
{`<Button variant="outline" size="lg">
  Click me
</Button>`}
            </pre>

            <h3 className="font-medium mt-4 mb-2">Custom Button:</h3>
            <pre className="text-sm bg-background p-2 rounded border overflow-x-auto">
{`<CustomButton variant="primary" size="lg">
  Click me
</CustomButton>`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}