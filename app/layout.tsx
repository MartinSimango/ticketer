import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticketer",
  description: "A dead-simple kanban ticketing board with an MCP server.",
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
