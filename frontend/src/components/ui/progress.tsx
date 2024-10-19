import { cn } from "@/lib/utils"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import * as React from "react"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value?: number
  }
>(({ className, value = 0, ...props }, ref) => (
  <div className="relative w-full">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "h-4 w-full overflow-hidden rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-400",
        className
      )}
      {...props}
    />
    <div
      className="absolute top-0 w-1 h-5 bg-black -mt-1"
      style={{ left: `calc(${value}% - 2px)` }}
    />
  </div>
))

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
