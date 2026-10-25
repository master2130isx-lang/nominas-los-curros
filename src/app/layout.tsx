import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./recibo.css";

export const metadata: Metadata = {
  title: "Nóminas Los Curros",
  description: "Pagos y recibos de nómina del restaurante Los Curros",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
