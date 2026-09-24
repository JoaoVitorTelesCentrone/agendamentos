import type { Metadata } from "next"
import { Archivo, Geist_Mono, Instrument_Sans } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

export const metadata: Metadata = {
  title: "AgendaFlow — Sua agenda, seus clientes, seu jeito",
  description:
    "Agenda inteligente para profissionais de serviços. Seus clientes agendam pelo link, seus atendimentos ficam organizados e você acompanha sua operação em um só lugar.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
}

const archivoHeading = Archivo({ subsets: ["latin"], variable: "--font-heading" })

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", instrumentSans.variable, archivoHeading.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
