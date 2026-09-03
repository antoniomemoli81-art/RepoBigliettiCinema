import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "CinePass Vault | The Space Cinema Carnet",
  description: "Repository e tracciamento voucher The Space Cinema - Tesla Design System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col bg-[#fafafa] text-tesla-onyx antialiased">
        <Header />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
