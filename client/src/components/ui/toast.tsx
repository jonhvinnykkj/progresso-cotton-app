import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col gap-3 p-4 sm:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-background/95 text-foreground shadow-[0_0_30px_rgba(0,255,136,0.15)]",
        destructive: "border-destructive/30 bg-background/95 text-foreground shadow-[0_0_30px_rgba(255,68,68,0.15)]",
        success: "border-primary/30 bg-background/95 text-foreground shadow-[0_0_30px_rgba(0,255,136,0.15)]",
        warning: "border-neon-orange/30 bg-background/95 text-foreground shadow-[0_0_30px_rgba(255,149,0,0.15)]",
        info: "border-neon-cyan/30 bg-background/95 text-foreground shadow-[0_0_30px_rgba(0,212,255,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-primary ring-offset-background transition-all hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-all hover:text-foreground hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

// Componente de ícone estilizado para cada variante
const ToastIcon = ({ variant }: { variant?: string }) => {
  const iconWrapperClass = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
    {
      "bg-primary/20": variant === "success" || variant === "default",
      "bg-destructive/20": variant === "destructive",
      "bg-neon-orange/20": variant === "warning",
      "bg-neon-cyan/20": variant === "info",
    }
  );

  const iconClass = cn("h-5 w-5", {
    "text-primary": variant === "success" || variant === "default",
    "text-destructive": variant === "destructive",
    "text-neon-orange": variant === "warning",
    "text-neon-cyan": variant === "info",
  });

  const Icon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className={iconClass} />;
      case "destructive":
        return <AlertCircle className={iconClass} />;
      case "warning":
        return <AlertTriangle className={iconClass} />;
      case "info":
        return <Info className={iconClass} />;
      default:
        return <CheckCircle2 className={iconClass} />;
    }
  };

  return (
    <div className={iconWrapperClass}>
      <Icon />
    </div>
  );
};

// Helper para obter ícone baseado na variante (mantido para compatibilidade)
const getToastIcon = (variant?: string) => {
  return <ToastIcon variant={variant} />;
};

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  getToastIcon,
  ToastIcon,
}
