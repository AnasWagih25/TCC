"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Camera, CheckCircle2, Star, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CustomerReview, prepareReviewPhoto, saveReview } from "@/lib/reviews";

type Props = {
  initial?: CustomerReview;
  staff?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
};
export default function ReviewForm({
  initial,
  staff = false,
  onSaved,
  onCancel,
}: Props) {
  const { products } = useCart();
  const [name, setName] = useState(initial?.name || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [product, setProduct] = useState(initial?.product || "");
  const [rating, setRating] = useState(initial?.rating || 0);
  const [photos, setPhotos] = useState(initial?.photos || []);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const previews = useRef<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [preparedReview, setPreparedReview] = useState<CustomerReview | null>(
    null,
  );
  const locked = busy || preparedReview !== null;
  const [publication, setPublication] = useState<CustomerReview["status"]>(
    initial?.status || (staff ? "published" : "pending"),
  );
  const reviewId = useRef(initial?.id || "");
  useEffect(
    () => () => previews.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  const addPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = [...(event.target.files || [])];
    event.target.value = "";
    setError("");
    if (selected.length + files.length + photos.length > 3) {
      setError("You can add up to 3 photos. Remove one to choose another.");
      return;
    }
    setPreparing(true);
    try {
      const prepared = await Promise.all(selected.map(prepareReviewPhoto));
      setFiles((current) => [
        ...current,
        ...prepared.map((file) => {
          const preview = URL.createObjectURL(file);
          previews.current.push(preview);
          return { file, preview };
        }),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t read that photo. Please try another.",
      );
    } finally {
      setPreparing(false);
    }
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || preparing) return;
    setError("");
    if (!rating) {
      setError("Choose a star rating before sending your review.");
      return;
    }
    if (!name.trim() || !title.trim() || body.trim().length < 10) {
      setError(
        "Add your name, a title, and a review of at least 10 characters.",
      );
      return;
    }
    setBusy(true);
    if (!reviewId.current) reviewId.current = crypto.randomUUID();
    let attemptedReview = preparedReview;
    try {
      await saveReview(
        preparedReview || {
          id: reviewId.current,
          name: name.trim(),
          title: title.trim(),
          body: body.trim(),
          product,
          rating,
          photos,
          status: staff ? publication : "pending",
          createdAt: initial?.createdAt || new Date().toISOString(),
          source: initial?.source || (staff ? "staff" : "customer"),
        },
        preparedReview ? [] : files.map((item) => item.file),
        (prepared) => {
          attemptedReview = prepared;
          setPreparedReview(prepared);
        },
      );
      setSaved(true);
      onSaved?.();
    } catch {
      setError(
        attemptedReview
          ? "We couldn’t confirm the save. Your review may already be with us. Your content is locked so you can retry the same submission without adding duplicate photos. If this continues, contact our team."
          : "We couldn’t upload your photos. Your words and photos are still here. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (saved)
    return (
      <div className="review-success" role="status">
        <CheckCircle2 size={34} strokeWidth={1.3} />
        <h3>
          {staff ? "Review saved." : "Thanks for sharing your cookie moment."}
        </h3>
        <p>
          {staff
            ? "Your publishing choice has been saved."
            : "Your review has been sent to our team. It will appear here once it has been reviewed."}
        </p>
        {onCancel && (
          <button className="text-link" onClick={onCancel}>
            Done <ArrowUpRight size={16} />
          </button>
        )}
      </div>
    );
  return (
    <form
      className="review-form"
      onSubmit={submit}
      aria-label={staff ? "Manage customer review" : "Write a review"}
    >
      <div className="review-form-heading">
        <h3>
          {initial ? "Edit this cookie story" : "How was your cookie moment?"}
        </h3>
        {onCancel && (
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            aria-label="Close review form"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <p className="form-intro">
        {staff
          ? "Add or update a genuine customer review with their permission."
          : "The delicious details, the honest thoughts, the last bite. We want to hear it all."}
      </p>
      <fieldset className="rating-field">
        <legend>
          Your rating <span>(required)</span>
        </legend>
        <div
          className="rating-picker"
          role="radiogroup"
          aria-label="Your rating"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={rating >= value ? "selected" : ""}>
              <input
                disabled={locked}
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                required
                aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              />
              <Star
                size={29}
                strokeWidth={1.4}
                fill={rating >= value ? "currentColor" : "none"}
              />
            </label>
          ))}
          <span>
            {rating
              ? [
                  "",
                  "Not my favorite",
                  "Could be better",
                  "Pretty good",
                  "Loved it",
                  "Love at first bite",
                ][rating]
              : "Select your stars"}
          </span>
        </div>
      </fieldset>
      <div className="form-row">
        <label>
          Your name
          <input
            disabled={locked}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={60}
            autoComplete="name"
            placeholder="How should we credit you?"
          />
        </label>
        <label>
          What did you order? <span>(optional)</span>
          <select
            disabled={locked}
            value={product}
            onChange={(event) => setProduct(event.target.value)}
          >
            <option value="">Choose your concept</option>
            {initial?.product &&
              !products.some((item) => item.name === initial.product) && (
                <option>{initial.product}</option>
              )}
            {products.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Give your review a title
        <input
          disabled={locked}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={100}
          placeholder="The short and sweet version"
        />
      </label>
      <label>
        Your review
        <textarea
          disabled={locked}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="Tell us what you loved, or what we could do better…"
        />
      </label>
      <div className="photo-upload-row">
        <div>
          <strong>A picture is worth a thousand crumbs.</strong>
          <p>Optional · Up to 3 photos · JPG, PNG or WebP · 8 MB each</p>
        </div>
        <label
          className={`upload-button ${preparing || locked || photos.length + files.length >= 3 ? "disabled" : ""}`}
        >
          <Camera size={19} />
          {preparing
            ? "Preparing…"
            : photos.length + files.length >= 3
              ? "3 photos added"
              : "Add photos"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={addPhotos}
            disabled={locked || preparing || photos.length + files.length >= 3}
          />
        </label>
      </div>
      {(photos.length > 0 || files.length > 0) && (
        <div className="photo-previews">
          {photos.map((photo, index) => (
            <div key={photo}>
              <Image
                src={photo}
                alt={`Attached order photo ${index + 1}`}
                width={100}
                height={100}
                unoptimized
              />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() =>
                  setPhotos((current) =>
                    current.filter((_, item) => item !== index),
                  )
                }
                disabled={locked}
              >
                <X size={15} />
              </button>
            </div>
          ))}
          {files.map((item, index) => (
            <div key={item.preview}>
              <Image
                src={item.preview}
                alt={`Order photo preview ${index + 1}`}
                width={100}
                height={100}
                unoptimized
              />
              <button
                type="button"
                aria-label={`Remove new photo ${index + 1}`}
                disabled={locked}
                onClick={() => {
                  URL.revokeObjectURL(item.preview);
                  setFiles((current) =>
                    current.filter((_, itemIndex) => index !== itemIndex),
                  );
                }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {staff && (
        <label>
          Visibility
          <select
            disabled={locked}
            value={publication}
            onChange={(event) =>
              setPublication(event.target.value as CustomerReview["status"])
            }
          >
            <option value="published">Published — visible to everyone</option>
            <option value="pending">Pending review</option>
            <option value="hidden">Hidden — kept in the staff portal</option>
          </select>
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="review-form-bottom">
        <p>
          {staff
            ? "Only publish reviews you have permission to share."
            : "Your name, review and photos may be published after moderation. Please keep personal details out of your photos."}
        </p>
        <button
          className="button-chocolate"
          type="submit"
          disabled={busy || preparing}
        >
          {busy
            ? "Saving your story…"
            : preparedReview
              ? "Confirm this submission"
              : staff
                ? "Save review"
                : "Send my review"}
          <span>
            <ArrowUpRight size={19} />
          </span>
        </button>
      </div>
    </form>
  );
}
