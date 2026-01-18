import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

    let variantClasses = ""
    switch (variant) {
      case "secondary":
        variantClasses = "bg-gray-200 text-gray-900 hover:bg-gray-300"
        break
      case "outline":
        variantClasses = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        break
      case "ghost":
        variantClasses = "text-gray-700 hover:bg-gray-100"
        break
      default:
        variantClasses = "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
    }

    let sizeClasses = ""
    switch (size) {
      case "sm":
        sizeClasses = "px-3 py-1 text-xs"
        break
      case "lg":
        sizeClasses = "px-6 py-3 text-base"
        break
      case "icon":
        sizeClasses = "p-2"
        break
      default:
        sizeClasses = ""
    }

    return (
      <button
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
