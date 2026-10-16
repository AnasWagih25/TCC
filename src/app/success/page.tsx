"use client";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { remainingPaymentLabel } from "@/lib/admin-orders";

const amount = (value: number) => `EGP ${value.toFixed(2)}`;

function SuccessContent() {
  const params = useSearchParams();
  const { orders, pickupSettings } = useCart();
  const id = params.get("orderId");
  const order = orders.find((item) => item.id === id);
  const pickup = order?.pickupSnapshot || pickupSettings;
  return (
    <div className="success-card">
      <CheckCircle2 size={48} strokeWidth={1.1} />
      <h1>
        {order ? "A little joy, received." : id ? "Your order reference." : "Your next cookie moment awaits."}
      </h1>
      <p>
        {order ? (
          <>
            Thanks for choosing The Cookie Concept.
            <br />
            We’ve received order <strong>#{order.id}</strong>.
          </>
        ) : (
          id ? <>Reference <strong>{id}</strong>. Its details are unavailable in this browser session. Contact the bakery with this reference if you need help.</> : "Browse the menu to start a new cookie story."
        )}
      </p>
      {order && (
        <div className="success-detail">
          <strong>What happens next?</strong>
          {order?.deliveryMethod === "pickup" ? (
            <>
              Your pickup location is {pickup.address}.<br />
              {pickup.hoursNotice}.
            </>
          ) : (
            "Our team will contact you to confirm your delivery details and timing."
          )}
          {order.payment ? <>
            <br /><br />
            <strong>{order.payment.plan === 'deposit' ? 'Your 50% deposit' : 'Your full payment'}</strong>
            {amount(order.payment.amountSubmitted)} submitted through Instapay.
            <br />
            {order.payment.status === 'pending_review' ? <>Your screenshot amount matched {amount(order.payment.receipt.detectedAmount)}. Our team will confirm the transfer before preparing your order.</> : order.payment.status === 'rejected' ? 'The transfer needs attention. Please contact the bakery with your order reference.' : 'Your transfer has been verified by our team.'}
            {order.payment.remainingAmount > 0 && <><br /><br />{order.paymentStatus === 'paid' ? 'Your remaining balance has been received.' : <>Remaining after the submitted deposit: <strong>{amount(order.payment.remainingAmount)}</strong> by {remainingPaymentLabel(order)}.</>}</>}
          </> : <><br />Our team will confirm your recorded payment arrangements with you.</>}
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
