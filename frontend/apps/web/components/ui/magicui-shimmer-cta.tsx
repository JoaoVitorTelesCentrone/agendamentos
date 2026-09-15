"use client"

import { useRouter } from "next/navigation"

import { ShimmerButton } from "./magicui-shimmer-button"

export function ShimmerCta({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <ShimmerButton type="button" onClick={() => router.push(href)}>
      {children}
    </ShimmerButton>
  )
}
