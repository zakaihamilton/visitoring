import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visitoring — clear website analytics",
  description: "Private, lightweight analytics for the websites you run.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
