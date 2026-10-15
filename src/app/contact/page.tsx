"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ContactPage() {
  const { pickupSettings } = useCart();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    inquiryType: "General Inquiry",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const change = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/send-contact-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error("Message not sent");
      setStatus("success");
      setForm({
        name: "",
        email: "",
        phone: "",
        inquiryType: "General Inquiry",
        message: "",
      });
    } catch {
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  };
  return (
    <div className="contact-layout section-wrap">
      <div className="contact-copy">
        <h1>
          Let’s talk
          <br />
          <em>cookies.</em>
        </h1>
        <p>
          A question about your order? Something special to celebrate? Or just a
          hello? We’d love to hear from you.
        </p>
        <div className="contact-details">
          <h2>Find us in New Cairo</h2>
          <p>
            {pickupSettings.address}
            <br />
            Pickup: {pickupSettings.hoursNotice}
          </p>
          <a
            href={pickupSettings.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Get directions <ArrowUpRight size={16} />
          </a>
        </div>
        <Link href="/reviews" className="text-link">
          Here to leave a review? <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="contact-form">
        {status === "success" ? (
          <div className="review-success" role="status">
            <CheckCircle2 size={35} strokeWidth={1.4} />
            <h2>Hello, received.</h2>
            <p>
              Thanks for reaching out. Your message is with our team, and we’ll
              get back to you.
            </p>
            <button className="text-link" onClick={() => setStatus("idle")}>
              Send another message <ArrowUpRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                Your name
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => change("name", event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => change("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Phone <span>(optional)</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => change("phone", event.target.value)}
                  placeholder="01xxxxxxxxx"
                />
              </label>
              <label>
                What’s on your mind?
                <select
                  value={form.inquiryType}
                  onChange={(event) =>
                    change("inquiryType", event.target.value)
                  }
                >
                  <option>General Inquiry</option>
                  <option>Order Issue</option>
                  <option>Corporate/Bulk Event</option>
                  <option>Feedback</option>
                </select>
              </label>
            </div>
            <label>
              Your message
              <textarea
                required
                minLength={10}
                maxLength={4000}
                rows={6}
                value={form.message}
                onChange={(event) => change("message", event.target.value)}
                placeholder="Tell us a little more…"
              />
            </label>
            {status === "error" && (
              <p role="alert" className="form-error">
                We couldn’t send your message. Your details are still here.
                Please try again in a moment.
              </p>
            )}
            <button
              className="button-chocolate"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending your hello…"
                : "Send your message"}
              <span>
                <ArrowUpRight size={20} />
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
