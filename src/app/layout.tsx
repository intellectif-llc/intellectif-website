import type { Metadata } from "next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/components/providers/QueryProvider";
import ProtectedChatWidget from "@/components/chat/ProtectedChatWidget";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://intellectif.com";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Intellectif | Custom Software Solutions & AI Integrations",
  description:
    "Intellectif provides expert custom software development, AI integration, and technology consulting to elevate your business.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <QueryProvider>
          <AuthProvider>
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
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </QueryProvider>

        {/* Protected Rocket.Chat Widget with Turnstile Bot Protection */}
        <ProtectedChatWidget />

        {/* Google Analytics Script */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VKMTFF0W4D"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VKMTFF0W4D');
          `}
        </Script>
      </body>
    </html>
  );
}
