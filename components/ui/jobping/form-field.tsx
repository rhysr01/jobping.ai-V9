"use client";

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface JobPingFormFieldProps {
  control: any;
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  type?: string;
  variant?: "input" | "textarea" | "switch" | "checkbox" | "radio-group";
  className?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric" | "decimal";
  disabled?: boolean;
  options?: { value: string; label: string }[]; // For radio-group
}

export function JobPingFormField({
  control,
  name,
  label,
  required = false,
  placeholder,
  helpText,
  type = "text",
  variant = "input",
  className,
  autoComplete,
  inputMode,
  disabled = false,
  options = [],
  ...props
}: JobPingFormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
            <span>{label}</span>
            {required && <span className="text-error text-sm" aria-hidden="true">*</span>}
          </FormLabel>

          {helpText && (
            <p className="text-sm font-medium text-zinc-300 mb-3 sm:mb-4 leading-relaxed">
              {helpText}
            </p>
          )}

          <FormControl>
            {variant === "textarea" ? (
              <Textarea
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[120px]",
                  "bg-black/50 border-2 rounded-lg",
                  "text-white placeholder-zinc-400",
                  "focus:border-brand-500 focus:outline-none",
                  "focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black",
                  "transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation resize-none",
                  // Dynamic validation styling
                  field.value && !fieldState.error
                    ? "border-success/60 shadow-md"
                    : fieldState.error
                      ? "border-red-500/60 shadow-md"
                      : "border-zinc-700 hover:border-zinc-600",
                  className
                )}
                {...field}
                {...props}
              />
            ) : variant === "switch" ? (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  className={cn(className)}
                  {...props}
                />
                <span className="text-sm text-zinc-300">{label}</span>
              </div>
            ) : variant === "checkbox" ? (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  className={cn(className)}
                  {...props}
                />
                <span className="text-sm text-zinc-300">{placeholder || label}</span>
              </div>
            ) : variant === "radio-group" && options.length > 0 ? (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                className={cn("space-y-3", className)}
                {...props}
              >
                {options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                    <label
                      htmlFor={`${name}-${option.value}`}
                      className="text-sm text-zinc-300 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode={inputMode}
                disabled={disabled}
                className={cn(
                  // Keep your exact mobile-first styling
                  "w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[56px]",
                  "bg-black/50 border-2 rounded-lg",
                  "text-white placeholder-zinc-400",
                  "focus:border-brand-500 focus:outline-none",
                  "focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black",
                  "transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation",
                  // Dynamic validation styling - matches SharedFormField
                  field.value && !fieldState.error
                    ? "border-success/60 shadow-md"
                    : fieldState.error
                      ? "border-red-500/60 shadow-md"
                      : "border-zinc-700 hover:border-zinc-600",
                  className
                )}
                {...field}
                {...props}
              />
            )}
          </FormControl>

          {/* Enhanced error message with icon */}
          <FormMessage className="mt-2 text-sm text-error flex items-center gap-2 font-medium animate-in slide-in-from-top-1 duration-200" />
        </FormItem>
      )}
    />
  );
}