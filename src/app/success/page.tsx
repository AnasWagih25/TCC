"use client";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
function SuccessContent() {
  const params = useSearchParams();
  const { orders, pickupSettings } = useCart();
  const id = params.get("orderId");
  const order = orders.find((item) => item.id === id);
  return (
    <div className="success-card">
      <CheckCircle2 size={48} strokeWidth={1.1} />
      <h1>
        {id ? "A little joy is on its way." : "Your next cookie moment awaits."}
      </h1>
      <p>
        {id ? (
          <>
            Thanks for choosing The Cookie Concept.
            <br />
            We’ve received order <strong>#{id}</strong>.
          </>
        ) : (
          "Browse the menu to start a new cookie story."
        )}
      </p>
      {id && (
        <div className="success-detail">
          <strong>What happens next?</strong>
          {order?.deliveryMethod === "pickup" ? (
            <>
              Your pickup location is {pickupSettings.address}.<br />
              {pickupSettings.hoursNotice}.
            </>
          ) : (
            "Our team will contact you to confirm your delivery details and timing."
          )}
          <br />
          Payment is available by cash, Instapay or Telda.
        </div>
      )}
      <div className="success-links">
        <Link href="/shop" className="button-chocolate">
          Back to the menu{" "}
          <span>
            <ArrowUpRight size={19} />
          </span>
        </Link>
        <Link href="/reviews" className="text-link">
          Share a review after your first bite <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}
export default function SuccessPage() {
  return (
    <section className="section-wrap">
      <Suspense fallback={<p role="status">Finding your cookie moment…</p>}>
        <SuccessContent />
      </Suspense>
    </section>
  );
}
