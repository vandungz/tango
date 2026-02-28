import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tango — Sun & Moon Puzzle Game",
  description: "A beautiful logic puzzle game. Fill the grid with Suns and Moons following balance, adjacency, and clue rules. No guessing — pure deduction!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
