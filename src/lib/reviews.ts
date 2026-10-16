import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export type CustomerReview = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  product: string;
  photos: string[];
  status: "pending" | "published" | "hidden";
  createdAt: string;
  source: "customer" | "staff";
};
export function withDeadline<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error("The connection is taking too long. Please try again."),
          ),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
export function isCustomerReview(value: unknown): value is CustomerReview {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    typeof item.product === "string" &&
    Number.isInteger(item.rating) &&
    Number(item.rating) >= 1 &&
    Number(item.rating) <= 5 &&
    typeof item.createdAt === "string" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    ["pending", "published", "hidden"].includes(String(item.status)) &&
    Array.isArray(item.photos) &&
    item.photos.length <= 3 &&
    item.photos.every(
      (photo) =>
        typeof photo === "string" &&
        photo.startsWith("https://firebasestorage.googleapis.com/"),
    )
  );
}
export async function loadReviews(staff = false): Promise<CustomerReview[]> {
  const request = staff
    ? query(collection(db, "reviews"), limit(200))
    : query(
        collection(db, "reviews"),
        where("status", "==", "published"),
        limit(200),
      );
  const snapshot = await withDeadline(getDocs(request));
  return snapshot.docs
    .map((item) => ({ ...item.data(), id: item.id }) as CustomerReview)
    .filter(isCustomerReview);
}
export function subscribeReviews(staff: boolean, onReviews: (reviews: CustomerReview[]) => void, onError: (error: unknown) => void) {
  const request = staff
    ? query(collection(db, 'reviews'), limit(200))
    : query(collection(db, 'reviews'), where('status', '==', 'published'), limit(200));
  const timer = setTimeout(() => onError(new Error('Reviews are taking too long to load. Please check your connection.')), 15000);
  const unsubscribe = onSnapshot(request, snapshot => {
    clearTimeout(timer);
    onReviews(snapshot.docs.map(item => ({ ...item.data(), id: item.id })).filter(isCustomerReview));
  }, error => { clearTimeout(timer); onError(error); });
  return () => { clearTimeout(timer); unsubscribe(); };
}
export function reviewSaveFailure(error: unknown, prepared: boolean) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const definitive = ['permission-denied', 'unauthenticated', 'storage/unauthorized', 'storage/unauthenticated', 'invalid-argument'].includes(code);
  const message = definitive
    ? 'The server denied this save. Please contact the bakery so we can check review permissions. Your review has been kept here.'
    : prepared
      ? 'We couldn’t confirm the save. Your review may already be with us. Retry this same submission to avoid duplicates.'
      : 'We couldn’t finish uploading your photos. Your words and photos are still here. Please try again.';
  return { definitive, message };
}
export async function prepareReviewPhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP photo.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Each photo must be smaller than 8 MB.");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("We couldn’t prepare that photo. Please try another.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("We couldn’t prepare that photo.")),
      "image/jpeg",
      0.82,
    ),
  );
  return new File([blob], `${crypto.randomUUID()}.jpg`, { type: "image/jpeg" });
}
export async function saveReview(
  review: CustomerReview,
  files: File[],
  onPrepared?: (prepared: CustomerReview) => void,
): Promise<void> {
  const photos = [...review.photos];
  for (const file of files) {
    const photoRef = ref(
      storage,
      `review-photos/${review.id}/${crypto.randomUUID()}.jpg`,
    );
    const upload = uploadBytesResumable(photoRef, file, {
      contentType: "image/jpeg",
    });
    const timer = setTimeout(() => upload.cancel(), 20000);
    try {
      await upload;
      photos.push(await withDeadline(getDownloadURL(photoRef)));
    } finally {
      clearTimeout(timer);
    }
  }
  const prepared = { ...review, photos };
  onPrepared?.(prepared);
  await withDeadline(setDoc(doc(db, "reviews", review.id), prepared));
}
