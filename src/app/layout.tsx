import type { Metadata, Viewport } from "next";
import { Outfit, Fredoka } from "next/font/google";
import "./globals.css";
import "./redesign.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const fredoka = Fredoka({ subsets: ["latin"], variable: '--font-fredoka' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "The Cookie Concept",
  description: "Artisan cookies baked with love. Order online for delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${outfit.variable} ${fredoka.variable}`}>
        <LoadingScreen />
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <div id="toastContainer" className="toast-container"></div>
            <main id="app">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
