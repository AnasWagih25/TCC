# The Cookie Concept

<!-- impeccable:product-schema 1 -->

## Platform
Web, responsive storefront.

## Product and audience
The Cookie Concept is a Cairo cookie bakery. Visitors browse cookies, cookie cakes and configurable boxes, choose sizes and extras, and place delivery or pickup orders. Staff manage products, categories, stock, orders, promotions and pickup settings.

## Existing implementation
Next.js 16, React 19, TypeScript, CSS, Firebase Auth, Firestore and Storage. Existing product photography, logo and Ahsing display font are supplied in public/. Currency is EGP. Existing checkout supports a location map, distance-based delivery fees, next-day pickup and promo codes. Existing contact and order email endpoints must remain functional.

## Requested outcome
The user authorized a complete redesign using Impeccable and project skills, delegating visual judgment. The experience should be simple to navigate, interactive, animated and clear. Add customer ratings, written reviews and optional order photographs, plus staff publishing controls. Preserve existing commerce and staff functionality.

## Content integrity
Use actual catalog data and supplied photographs. Do not invent customer reviews, rating averages, sales figures or endorsements. Published reviews must come from stored submissions. Empty states should invite the first review.

## Open deployment decisions
Firebase review collection and image storage permissions require deployment configuration; never claim local drafts are public submissions. Public reviews are moderated before publication.
