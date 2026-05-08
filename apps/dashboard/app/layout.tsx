import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "OVERSIGHT AI",
  description: "Video intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
