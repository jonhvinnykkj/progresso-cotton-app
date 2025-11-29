import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // iOS-style button base
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-xl hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground rounded-xl hover:brightness-105",
        outline:
          "border border-border bg-transparent text-foreground rounded-xl hover:bg-surface",
        secondary:
          "bg-secondary text-secondary-foreground rounded-xl hover:bg-surface-hover",
        ghost:
          "bg-transparent text-foreground rounded-xl hover:bg-surface/80",
        // iOS-style link button
        link:
          "text-primary underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-[15px]",
        sm: "h-9 px-4 py-2 text-[13px] rounded-lg",
        lg: "h-12 px-8 py-3 text-[17px]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
