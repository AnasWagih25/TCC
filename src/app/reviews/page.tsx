import Reviews from "@/components/Reviews";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Customer reviews",
  description:
    "Real cookie moments, honest customer reviews, and photos from The Cookie Concept community.",
};
export default function ReviewsPage() {
  return <Reviews />;
}
