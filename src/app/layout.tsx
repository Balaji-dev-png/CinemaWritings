import type { Metadata } from "next";
import "./globals.css";

import Script from "next/script";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";

export const metadata: Metadata = {
  title: "CinemaWritings - Screenplay Editor",
  description: "A soft UI typewriter-style screenplay editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans transition-colors duration-500 bg-zinc-50 dark:bg-black">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5Z7BE1JVD2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5Z7BE1JVD2');
          `}
        </Script>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <ChatbotWidget />
          </ThemeProvider>
      </body>
    </html>
  );
}
