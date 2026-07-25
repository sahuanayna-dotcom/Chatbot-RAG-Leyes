import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatbot Leyes Perú - Congreso de la República",
  description: "Asistente virtual para consultar proyectos de ley del Congreso del Perú",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="h-full font-sans antialiased bg-gray-50">{children}</body>
    </html>
  );
}
