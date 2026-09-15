"use client"

import { motion, type HTMLMotionProps } from "motion/react"

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

export function MotionSection(props: HTMLMotionProps<"section">) {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      {...props}
    />
  )
}

export function MotionDiv(props: HTMLMotionProps<"div">) {
  return <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} {...props} />
}

export function MotionLi(props: HTMLMotionProps<"li">) {
  return <motion.li variants={fadeUp} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} {...props} />
}

/** A self-contained reveal for pages that don't need a motion parent. */
export function Reveal({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  )
}

export function Pressable(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      {...props}
    />
  )
}

export function HoverLift(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      {...props}
    />
  )
}
