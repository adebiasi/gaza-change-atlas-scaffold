import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gaza Change Atlas",
  description: "Satellite change comparison with event and OpenStreetMap context",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
