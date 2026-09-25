import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SerStorm CRM — Marketing Digital Turístico",
  description: "Panel de control del agente conversacional y CRM para agencias de viajes y hoteles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
