import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[40px] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:bg-blue-800 focus-visible:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:bg-red-800 focus-visible:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700",
        outline:
          "border-2 border-slate-300 bg-transparent hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 focus-visible:ring-slate-500 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-500",
        secondary:
          "bg-slate-200 text-slate-900 hover:bg-slate-300 hover:shadow-sm active:bg-slate-400 focus-visible:ring-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:active:bg-slate-800",
        ghost: "hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:active:bg-slate-700",
        link: "text-blue-700 underline-offset-4 hover:underline hover:text-blue-800 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:text-blue-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }