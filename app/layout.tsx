import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlueMind Admin",
  description: "Employee order dashboard for BlueMind Web Service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
