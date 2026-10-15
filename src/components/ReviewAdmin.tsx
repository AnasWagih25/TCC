"use client";
import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CustomerReview, loadReviews, withDeadline } from "@/lib/reviews";
import ReviewForm from "./ReviewForm";
import { ReviewCard } from "./Reviews";

export default function ReviewAdmin() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("pending");
  const [editing, setEditing] = useState<CustomerReview | "new" | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    let active = true;
    loadReviews(true)
      .then((items) => {
        if (active) {
          setReviews(
            items.sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
            ),
          );
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Reviews could not be loaded. Check your connection and staff access to the reviews collection.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  const changeStatus = async (
    review: CustomerReview,
    status: CustomerReview["status"],
  ) => {
    setBusy(review.id);
    setError("");
    try {
      await withDeadline(updateDoc(doc(db, "reviews", review.id), { status }));
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status } : item,
        ),
      );
    } catch {
      setError("The publishing change could not be saved. Please try again.");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="review-admin">
      <div className="admin-toolbar">
        <div>
          <h2>Customer stories</h2>
          <p>
            Review submissions, add photos, and choose what appears on the
            website.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          Add a review
        </button>
      </div>
      <div className="review-filters">
        {["pending", "published", "hidden", "all"].map((status) => (
          <button
            className={`filter-chip ${filter === status ? "active" : ""}`}
            key={status}
            onClick={() => setFilter(status)}
          >
            {status[0].toUpperCase() + status.slice(1)} (
            {
              reviews.filter(
                (item) => status === "all" || item.status === status,
              ).length
            }
            )
          </button>
        ))}
        <button
          className="text-link"
          onClick={() => {
            setLoading(true);
            setVersion((current) => current + 1);
          }}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {editing && (
        <ReviewForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          staff
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
      {loading ? (
        <p role="status">Loading reviews…</p>
      ) : (
        <div className="reviews-grid">
          {reviews
            .filter((item) => filter === "all" || item.status === filter)
            .map((review) => (
              <div key={review.id}>
                <ReviewCard review={review} />
                <div className="moderation-actions">
                  <span>{review.status}</span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditing(review)}
                  >
                    Edit / add photos
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy === review.id}
                    onClick={() =>
                      changeStatus(
                        review,
                        review.status === "published" ? "hidden" : "published",
                      )
                    }
                  >
                    {busy === review.id
                      ? "Saving…"
                      : review.status === "published"
                        ? "Hide"
                        : "Publish"}
                  </button>
                </div>
              </div>
            ))}
          {!reviews.some(
            (item) => filter === "all" || item.status === filter,
          ) &&
            !error && (
              <div className="review-empty">
                <h3>No {filter === "all" ? "" : filter} reviews yet.</h3>
                <p>
                  Customer submissions arrive here for review. You can also add
                  genuine reviews with customer permission.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
