import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Onest } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const onest = Onest({ subsets: ["latin"], variable: "--font-sans" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "wdth"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Poller", template: "%s · Poller" },
  description: "Create quick polls, collect votes from your group, and understand the results.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f15" },
  ],
};

/** Each area (site, app, auth) brings its own chrome and `<main id="main">`. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", onest.variable, bricolage.variable, geistMono.variable)}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-panel px-4 py-3 font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
