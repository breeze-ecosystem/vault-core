"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "@radix-ui/themes/styles.css";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <Theme accentColor="cyan" grayColor="slate" radius="medium">
        {children}
      </Theme>
    </NextThemesProvider>
  );
}
