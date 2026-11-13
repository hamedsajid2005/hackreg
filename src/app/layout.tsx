import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { Toaster } from "sonner";
import { SITE } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "ZELVORA REGISTRATION PORTAL — Build. Innovate. Transform. | Zelvora Technologies",
    template: "%s | ZELVORA REGISTRATION PORTAL",
  },
  description:
    "Register your team for ZELVORA REGISTRATION PORTAL, the hackathon organised by Zelvora Technologies Pvt. Ltd. Choose from EdTech, AI Innovation, Healthcare and Business tracks.",
  applicationName: "ZELVORA REGISTRATION PORTAL",
  openGraph: {
    title: "ZELVORA REGISTRATION PORTAL — Build. Innovate. Transform.",
    description:
      "Team registration for ZELVORA REGISTRATION PORTAL, organised by Zelvora Technologies Pvt. Ltd.",
    type: "website",
    images: ["/zelvora-logo.png"],
  },
  icons: { icon: "/zelvora-logo.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04070B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "#0A1118",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#E2E8F0",
            },
          }}
        />
      </body>
    </html>
  );
}
