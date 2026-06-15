import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lone Star Portal",
  description: "Internal operations portal for Lone Star Contracting Group",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
