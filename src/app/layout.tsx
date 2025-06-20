import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intellectif - Elevate Your Business Efficiency",
  description:
    "Our tech solutions will give your business a competitive edge! We offer web development, backend development, AWS cloud services, digital marketing, mobile app development, and AI solutions for your business.",
  keywords:
    "web development, backend development, API integrations for businesses, aws cloud services, digital marketing, automate business processes, mobile app development, optimize business costs, Intellectif, leverage AI in your business",
  authors: [{ name: "Intellectif" }],
  openGraph: {
    title: "Intellectif - Elevate Your Business Efficiency",
    description:
      "Our tech solutions will give your business a competitive edge!",
    url: "https://intellectif.com",
    siteName: "Intellectif",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Intellectif - Elevate Your Business Efficiency",
    description:
      "Our tech solutions will give your business a competitive edge!",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main className="relative">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#fff",
                border: "1px solid #6bdcc0",
                borderRadius: "12px",
              },
              success: {
                iconTheme: {
                  primary: "#6bdcc0",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
              loading: {
                iconTheme: {
                  primary: "#6bdcc0",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
