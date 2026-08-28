import type { Metadata } from "next";
import "./globals.css";

import Script from "next/script";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";
import { Toaster } from "react-hot-toast";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@300;400;700&family=Courier+Prime:wght@400;700&family=Inter:wght@100..900&family=Lato:wght@300;400;700&family=Lora:wght@400..700&family=Montserrat:wght@100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Playfair+Display:wght@400..900&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans transition-colors duration-500 bg-zinc-50 dark:bg-black" suppressHydrationWarning>
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
            <Toaster position="bottom-right" />
          </ThemeProvider>
      </body>
    </html>
  );
}
