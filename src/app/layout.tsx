import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://visitoring.vercel.app"),
  applicationName: "Visitoring",
  title: "Visitoring — clear website analytics",
  description: "Private, lightweight analytics for the websites you run.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#28745f" }],
  },
  appleWebApp: {
    capable: true,
    title: "Visitoring",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Visitoring",
    title: "Visitoring — clear website analytics",
    description: "Private, lightweight analytics for the websites you run.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Visitoring — know your traffic, keep it simple.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visitoring — clear website analytics",
    description: "Private, lightweight analytics for the websites you run.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e292b",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
