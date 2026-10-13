import { Plus_Jakarta_Sans } from "next/font/google";

import AppShell from "@/components/AppShell";
import Providers from "@/components/providers/Providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Mappetite",
  description: "Simpan daftar tempat makan incaranmu dari link Google Maps dan lihat semuanya di peta.",
};

export const viewport = {
  themeColor: "#5D6C4B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
