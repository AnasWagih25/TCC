"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, MessageSquare, Star, X } from "lucide-react";
import { CustomerReview, loadReviews } from "@/lib/reviews";
import ReviewForm from "@/components/ReviewForm";

export function ReviewCard({
  review,
  onPhoto,
}: {
  review: CustomerReview;
  onPhoto?: (url: string, caption: string) => void;
}) {
  return (
    <article className="review-card">
      <div className="review-card-top">
        <span
          className="review-stars"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={15}
              strokeWidth={1.3}
              fill={star <= review.rating ? "currentColor" : "none"}
            />
          ))}
        </span>
        <time dateTime={review.createdAt}>
          {new Intl.DateTimeFormat("en", {
            month: "short",
            year: "numeric",
          }).format(new Date(review.createdAt))}
        </time>
      </div>
      <h3>{review.title}</h3>
      <p>{review.body}</p>
      {review.photos.length > 0 && (
        <div className="review-photos">
          {review.photos.map((photo, index) =>
            onPhoto ? (
              <button
                key={photo}
                onClick={() =>
                  onPhoto(photo, `${review.name}’s order, photo ${index + 1}`)
                }
                aria-label={`View ${review.name}’s order photo ${index + 1}`}
              >
                <Image
                  src={photo}
                  alt={`${review.name}’s order photo ${index + 1}`}
                  width={360}
                  height={280}
                  unoptimized
                />
              </button>
            ) : (
              <a
                key={photo}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${review.name}’s order photo ${index + 1}`}
              >
                <Image
                  src={photo}
                  alt={`${review.name}’s order photo ${index + 1}`}
                  width={360}
                  height={280}
                  unoptimized
                />
              </a>
            ),
          )}
        </div>
      )}
      <div className="review-author">
        <span className="review-initial">{review.name[0]?.toUpperCase()}</span>
        <div>
          <strong>{review.name}</strong>
          {review.product && <span>{review.product}</span>}
        </div>
      </div>
    </article>
  );
}
export default function Reviews({ compact = false }: { compact?: boolean }) {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [stars, setStars] = useState("all");
  const [sort, setSort] = useState("newest");
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    loadReviews()
      .then((items) => {
        if (active) {
          setReviews(items);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    if (lightbox) dialog.current?.showModal();
  }, [lightbox]);
  const average = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      ).toFixed(1)
    : null;
  const filtered = reviews
    .filter(
      (review) =>
        (!photosOnly || review.photos.length > 0) &&
        (stars === "all" || review.rating === Number(stars)),
    )
    .sort((a, b) =>
      sort === "highest"
        ? b.rating - a.rating
        : sort === "lowest"
          ? a.rating - b.rating
          : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  const visible = compact ? filtered.slice(0, 3) : filtered;
  return (
    <section
      id="reviews"
      className={`reviews-section section-wrap ${compact ? "reviews-compact" : "reviews-full"}`}
    >
      <div className="section-heading">
        <div>
          {!compact && (
            <Link href="/" className="breadcrumb">
              Home / Cookie stories
            </Link>
          )}
          {compact ? (
            <h2>
              Good cookies.
              <br />
              <em>Honest words.</em>
            </h2>
          ) : (
            <h1>
              Your moments.
              <br />
              <em>Your cookie stories.</em>
            </h1>
          )}
        </div>
        <div>
          <p>
            From the first unboxing to the last crumb.
            <br />A space for your stories, photos, and honest reviews.
          </p>
          <button
            className="button-chocolate"
            onClick={() => setFormOpen(!formOpen)}
            aria-expanded={formOpen}
            aria-controls="write-review"
          >
            {formOpen ? "Close review form" : "Share your cookie moment"}
            <span>
              {formOpen ? <X size={18} /> : <ArrowUpRight size={19} />}
            </span>
          </button>
        </div>
      </div>
      {formOpen && (
        <div id="write-review">
          <ReviewForm onCancel={() => setFormOpen(false)} />
        </div>
      )}
      {average && (
        <div className="review-summary">
          <strong>
            {average}
            <span>/ 5</span>
          </strong>
          <div>
            <span className="review-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  fill={
                    star <= Math.round(Number(average))
                      ? "currentColor"
                      : "none"
                  }
                />
              ))}
            </span>
            <p>
              From {reviews.length} customer{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>
      )}
      {!compact && reviews.length > 0 && (
        <div className="review-filters">
          <button
            className={photosOnly ? "filter-chip active" : "filter-chip"}
            aria-pressed={photosOnly}
            onClick={() => setPhotosOnly(!photosOnly)}
          >
            <Camera size={16} /> With photos
          </button>
          <label className="sr-only" htmlFor="review-stars-filter">
            Filter by rating
          </label>
          <select
            id="review-stars-filter"
            value={stars}
            onChange={(event) => setStars(event.target.value)}
          >
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((star) => (
              <option key={star} value={star}>
                {star} {star === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="review-sort">
            Sort reviews
          </label>
          <select
            id="review-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      )}
      {loading ? (
        <div className="reviews-loading" role="status">
          Opening the cookie storybook…
        </div>
      ) : error ? (
        <div className="review-empty">
          <MessageSquare size={30} strokeWidth={1.3} />
          <h3>Cookie stories are taking a moment.</h3>
          <p>
            We couldn’t load reviews right now. Please try again, or share your
            own moment above.
          </p>
          <button
            className="text-link"
            onClick={() => {
              setLoading(true);
              setRetry((current) => current + 1);
            }}
          >
            Try again <ArrowUpRight size={16} />
          </button>
        </div>
      ) : visible.length ? (
        <div className="reviews-grid">
          {visible.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onPhoto={(url, caption) => setLightbox({ url, caption })}
            />
          ))}
        </div>
      ) : (
        <div className="review-empty">
          <div className="review-keepsake" aria-hidden="true">
            <span>
              <Camera />
            </span>
            <span>
              <MessageSquare />
            </span>
          </div>
          <h3>
            {reviews.length
              ? "No stories match just yet."
              : "Every great story starts with a first bite."}
          </h3>
          <p>
            {reviews.length
              ? "Try another rating, or turn off the photo filter."
              : "Tried a concept? Be the first to share a review. A photo of your order makes it even sweeter."}
          </p>
          {reviews.length ? (
            <button
              className="text-link"
              onClick={() => {
                setPhotosOnly(false);
                setStars("all");
              }}
            >
              Show all reviews <ArrowUpRight size={16} />
            </button>
          ) : (
            <button className="text-link" onClick={() => setFormOpen(true)}>
              Write the first review <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      )}
      {compact && (
        <Link className="text-link reviews-all" href="/reviews">
          Visit the cookie storybook <ArrowUpRight size={18} />
        </Link>
      )}
      <dialog
        className="photo-lightbox"
        ref={dialog}
        onClose={() => setLightbox(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="lightbox-close icon-button"
          aria-label="Close order photo"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        {lightbox && (
          <>
            <Image
              src={lightbox.url}
              alt={lightbox.caption}
              width={1400}
              height={1000}
              unoptimized
            />
            <p>{lightbox.caption}</p>
          </>
        )}
      </dialog>
    </section>
  );
}
