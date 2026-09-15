import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border-0 bg-[#F8F9FB] px-3 py-2 text-sm text-[#08163d] shadow-none ring-1 ring-black/5 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A317]/35 disabled:cursor-not-allowed disabled:opacity-50",
          type === "number" &&
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        onWheel={(event) => {
          if (type === "number") {
            event.currentTarget.blur()
          }
          onWheel?.(event)
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
