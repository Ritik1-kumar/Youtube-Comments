import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { HeroHeader } from "@/components/hero8-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YT Comments Analyzer",
  description: "YT Comments Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <HeroHeader />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <Toaster />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}