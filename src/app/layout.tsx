import type { Metadata } from "next";
import {
  Inter,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://omnis-one.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "OMNIS — The Intelligence of Everything",
  description:
    "Understand Anything. Connect Everything. Interactive 3D Global Atlas, Infinite Knowledge Graphs, Monte Carlo Simulations & Deep Research.",
  applicationName: "OMNIS",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "OMNIS — The Intelligence of Everything",
    description:
      "Understand Anything. Connect Everything. Interactive 3D Global Atlas, Infinite Knowledge Graphs, Monte Carlo Simulations & Deep Research.",
    url: "https://omnis-one.vercel.app",
    siteName: "OMNIS",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://omnis-one.vercel.app/og-image.jpg",
        secureUrl: "https://omnis-one.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "OMNIS — The Intelligence of Everything",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMNIS — The Intelligence of Everything",
    description:
      "Understand Anything. Connect Everything. Interactive 3D Global Atlas, Infinite Knowledge Graphs, Monte Carlo Simulations & Deep Research.",
    images: [
      {
        url: "https://omnis-one.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "OMNIS — The Intelligence of Everything",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem("omnis-intelligence-workspace-v1");if(!raw)return;var parsed=JSON.parse(raw);var t=parsed&&parsed.state&&parsed.state.theme;if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${editorial.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="image_src" href="https://omnis-one.vercel.app/og-image.jpg" />
        <meta itemProp="image" content="https://omnis-one.vercel.app/og-image.jpg" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
