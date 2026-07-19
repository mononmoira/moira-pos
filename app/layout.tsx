import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import type { Metadata, Viewport } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Moira POS",
  description: "Moira / DAYS 店舗向けPOSシステム",
  applicationName: "Moira POS",
  manifest: "/manifest.webmanifest",
  icons: [
    {
      rel: "icon",
      url: "/icon",
      type: "image/png",
    },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Moira POS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
  <ServiceWorkerRegister />
  {children}
</body>
    </html>
  );
}
