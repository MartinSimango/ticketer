import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticketer",
  description: "A dead-simple kanban ticketing board with an MCP server.",
  icons: {
    icon: "/logo.svg",
    apple: "/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
