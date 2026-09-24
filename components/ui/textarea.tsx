import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-2xl border border-input/80 bg-background/70 px-3.5 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3px focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[0_0_0_4px_color-mix(in_srgb,var(--ring)_15%,transparent)] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_22px_rgba(0,0,0,0.18)] dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
