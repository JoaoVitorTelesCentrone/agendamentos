// Temas (cor primária) que o tenant escolhe no painel de ajustes.
// A cor vai para tenants.primary_color e pinta a página pública de agendamento.

export const DEFAULT_BRAND = "#1e6b52"

export type ThemePreset = {
  id: string
  name: string
  color: string
}

// Todas escuras o suficiente para texto branco por cima (primary-foreground).
export const THEME_PRESETS: ThemePreset[] = [
  { id: "esmeralda", name: "Esmeralda", color: "#1e6b52" },
  { id: "oceano", name: "Oceano", color: "#155e75" },
  { id: "azul", name: "Azul", color: "#1d4ed8" },
  { id: "lavanda", name: "Lavanda", color: "#6d28d9" },
  { id: "rose", name: "Rosé", color: "#be185d" },
  { id: "vinho", name: "Vinho", color: "#881337" },
  { id: "terracota", name: "Terracota", color: "#9a3412" },
  { id: "cafe", name: "Café", color: "#5d4037" },
  { id: "grafite", name: "Grafite", color: "#334155" },
]
