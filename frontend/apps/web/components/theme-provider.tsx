"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

const ThemeContext = React.createContext<{
  theme: Theme | null
  setTheme: React.Dispatch<React.SetStateAction<Theme | null>>
} | null>(null)

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
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ThemeHotkey theme={theme} setTheme={setTheme} />
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  if (!theme) return null
  const dark = theme === "dark"
  return (
    <button
      type="button"
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card/70 text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/60 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/20"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
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

export { ThemeProvider, ThemeToggle, useTheme }
