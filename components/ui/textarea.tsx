import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-[88px] w-full resize-y rounded-xl border-0 bg-[#F8F9FB] px-3 py-2 text-sm text-[#08163d] shadow-none ring-1 ring-black/5 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-[#E8A317]/35 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
