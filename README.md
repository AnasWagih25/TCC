# The Cookie Concept

Responsive Next.js storefront for a Cairo cookie bakery. The redesigned experience covers the homepage, live menu, product customization and box builder, cart, delivery/pickup checkout, story, contact, reviews, and staff portal.

## Local development

```sh
npm install
npm run dev
```

Open http://localhost:3000. The application uses the existing Firebase project configured in `src/lib/firebase.ts`. Email endpoints use the existing local environment configuration. No credentials should be committed.

## Validation

```sh
npm run build
npx tsc --noEmit
node --test tests/*.test.cjs
npm run lint
```

The production build, TypeScript, review persistence tests, and targeted lint on redesigned storefront/review files pass. Repository-wide lint still reports legacy issues in the existing admin dashboard, checkout map, cart context and order-email endpoint.

## Customer reviews

Customers submit ratings, written feedback and up to three order photos. Public pages display published reviews; staff can inspect, edit, add photos, publish or hide submissions under **Staff portal → Reviews**. Empty states show honestly until reviews are published. Submission retries retain their prepared payload and do not upload the same images again.

**Before production:** follow [REVIEWS_SETUP.md](REVIEWS_SETUP.md) to merge the supplied Firebase rule fragments, configure staff claims and verify cloud writes/moderation using authorized test accounts. No live test reviews, messages or orders were submitted during local verification.

## Design

[DESIGN.md](DESIGN.md) records the final visual system. [PRODUCT.md](PRODUCT.md) records product constraints. Styling remains in the existing CSS stack, with the base system in `src/app/redesign.css` and the Taste refinement in `src/app/taste.css`. GSAP drives scoped storefront motion. The hero uses a contained cake image, real product previews, progressive image fallbacks, and system/light/dark appearance controls. The supplied Ahsing display face and the previously configured Outfit font are self-hosted. Existing bakery photographs are preserved; no fabricated testimonials or rating statistics are included.

Final previews and the independent design-review evidence are stored under `.impeccable/review/`. The local review was approved to ship; cloud permission and authenticated moderation checks remain deployment steps.
