import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Curia Host Service",
  description: "Standalone forum hosting infrastructure for embedding Curia forums",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          attribute="class"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
} 