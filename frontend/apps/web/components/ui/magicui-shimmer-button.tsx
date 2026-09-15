import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { cn } from "@workspace/ui/lib/utils"

type ShimmerButtonProps = ComponentPropsWithoutRef<"button"> & {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
}

/** Magic UI Shimmer Button, kept intentionally small for the main CTA. */
export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#dff8e9",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "0.75rem",
      background = "var(--primary)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
    <button
      ref={ref}
      {...props}
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      } as CSSProperties}
      className={cn(
        "group relative z-0 inline-flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius)] border border-white/15 px-7 font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-300 active:translate-y-px",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <span className="pointer-events-none absolute -inset-full -z-10 animate-spin-around bg-[conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
      <span className="pointer-events-none absolute inset-(--cut) -z-0 rounded-[var(--radius)] bg-[var(--bg)]" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_-8px_10px_#ffffff1f] transition-shadow duration-300 group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]" />
    </button>
    )
  }
)

ShimmerButton.displayName = "ShimmerButton"
