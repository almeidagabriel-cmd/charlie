import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Charlie - Gerenciamento de Tarefas", template: "%s · Charlie" },
  description: "Sistema de gestão de tarefas e rotinas operacionais",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        {/* Necessário para as mensagens de sucesso/erro (toast) aparecerem */}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
