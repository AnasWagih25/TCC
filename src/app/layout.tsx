import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./redesign.css";
import "./taste.css";
import "./polish.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf6ed",
};
export const metadata: Metadata = {
  title: {
    default: "The Cookie Concept | A good idea. A great cookie.",
    template: "%s | The Cookie Concept",
  },
  description:
    "Cookies, cookie cakes, and boxes made your way. Handcrafted in Cairo, with delivery and pickup. Find your next cookie moment at The Cookie Concept.",
  openGraph: {
    title: "The Cookie Concept",
    description: "A good idea. A great cookie. Handcrafted in Cairo.",
    images: [
      {
        url: "/images/preview.png",
        width: 800,
        height: 600,
        alt: "The Cookie Concept Kinder cookie cake",
      },
    ],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#app" className="skip-link">
          Skip to content
        </a>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <div
              id="toastContainer"
              className="toast-container"
              role="status"
              aria-live="polite"
            />
            <main id="app" tabIndex={-1}>
              {children}
            </main>
            <Footer />
            <Motion />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
