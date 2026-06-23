import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Phone English Admin",
  description: "Content, call, lesson, prompt, and subscription operations."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
