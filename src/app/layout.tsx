import type { Metadata } from "next";
import Providers from "@/components/providers/Providers";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  try {
    const key = 'tango_theme';
    const stored = localStorage.getItem(key);
    const theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
