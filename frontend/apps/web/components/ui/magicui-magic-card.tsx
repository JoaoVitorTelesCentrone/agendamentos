"use client"

import { useCallback, useState } from "react"
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"

type MagicCardProps = React.PropsWithChildren<{
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientFrom?: string
  gradientTo?: string
}>

/** Magic UI spotlight card, using the same motion primitives already in the app. */
export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientColor = "color-mix(in oklch, var(--primary) 13%, transparent)",
  gradientFrom = "var(--primary)",
  gradientTo = "var(--warm)",
}: MagicCardProps) {
  const [active, setActive] = useState(false)
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const springX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 })

  const handleMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    mouseX.set(event.clientX - rect.left)
    mouseY.set(event.clientY - rect.top)
  }, [mouseX, mouseY])

  const reset = useCallback(() => {
    setActive(false)
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [gradientSize, mouseX, mouseY])

  return (
    <motion.div
      className={cn("group relative isolate overflow-hidden rounded-[inherit] border border-border/80", className)}
      onPointerMove={handleMove}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={reset}
      style={{
        background: useMotionTemplate`linear-gradient(var(--card) 0 0) padding-box, radial-gradient(${gradientSize}px circle at ${springX}px ${springY}px, ${gradientFrom}, ${gradientTo}, var(--border) 100%) border-box`,
      }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px z-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          background: useMotionTemplate`radial-gradient(${gradientSize}px circle at ${springX}px ${springY}px, ${gradientColor}, transparent 100%)`,
          opacity: active ? 1 : 0,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
