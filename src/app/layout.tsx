import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIR CAMPUS X — One Campus. One Intelligence. Infinite Possibilities.",
  description:
    "AI-Powered Smart University Ecosystem for Air University Karachi Campus. Connect students, faculty and administration through intelligent campus management.",
  keywords: "Air University, Karachi, Smart Campus, AI, Digital Twin, Campus Management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f6f8fc] text-navy-950 antialiased">{children}</body>
    </html>
  );
}
