import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CampusStay Admin",
  description:
    "CampusStay administration frontend. Live administrative access is not enabled.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
