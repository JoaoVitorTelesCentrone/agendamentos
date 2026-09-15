"use client"

import * as React from "react"

type Theme = "light" | "dark"

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme | null>(null)

  React.useEffect(() => {
    const stored = window.localStorage.getItem("theme")
    const initial = stored === "light" || stored === "dark" ? stored : getSystemTheme()
    setTheme(initial)
    applyTheme(initial)
  }, [])

  React.useEffect(() => {
    if (!theme) return
    window.localStorage.setItem("theme", theme)
    applyTheme(theme)
  }, [theme])

  return (
    <>
      <ThemeHotkey theme={theme} setTheme={setTheme} />
      {children}
    </>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey({
  theme,
  setTheme,
}: {
  theme: Theme | null
  setTheme: React.Dispatch<React.SetStateAction<Theme | null>>
}) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (typeof event.key !== "string" || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme((current) => (current ?? theme ?? getSystemTheme()) === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [setTheme, theme])

  return null
}

export { ThemeProvider }
