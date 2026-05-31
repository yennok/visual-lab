import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visual Lab",
  description: "Generate brand-consistent images, on tap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        {/* Browser extensions (e.g. ColorZilla adds cz-shortcut-listen) mutate
            <body> before React hydrates, causing a spurious mismatch. This
            suppresses the warning for this element's own attributes only. */}
        <body className="min-h-full" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
