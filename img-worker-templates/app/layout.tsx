import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "img-worker-templates",
  description: "管理画面アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
