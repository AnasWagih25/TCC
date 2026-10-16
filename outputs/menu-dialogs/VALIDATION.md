# Menu dialog verification — 16 October 2026

Product details and box building now use scoped storefront styles and native dialogs, without changes to the menu grid or navigation.

## Automated checks

- All 51 Node tests pass, including three new regressions for size-priced extras, box totals and required personalization text.
- Targeted ESLint and TypeScript checks pass.
- Next.js production webpack build passes. The existing metadataBase warning remains unrelated to this change.

## Browser checks

- Box layouts: 320×568, 390×844, 768×1024, 844×390, 1440×1000; additionally 568×320 landscape.
- Personalized product layouts: 320×568, 390×400, 390×844, 844×390 and 1440×900.
- No horizontal overflow; dialogs and purchase buttons stay within the viewport; dialog buttons meet 44px minimum touch dimensions. Personalization input stays at 16px.
- Light and dark themes checked. Native accessibility tree exposes only modal content while open. Escape, backdrop click, close button, focus restoration and forward/backward keyboard wrapping checked.
- Mini cake plus writing: EGP 300 + EGP 35 = EGP 335. Empty/whitespace messages cannot be added; filled message and price reach the bag correctly.
- Four-cookie box: Kinder ×1 + Belgian ×2 + Lotus ×1 = EGP 270 + EGP 25 upgrades = EGP 295, preserved in the bag.
- A full box disables additions; removing one re-enables selection. Choosing the same size preserves contents; changing size clears contents and updates the price.
- A single Belgian cookie reaches the bag at EGP 65.
- Temporary bag items removed; no orders placed, stock changed or emails sent during these checks.

Screenshots: `product-desktop.png`, `box-mobile.png`, `box-mobile-dark.png`.

Browser viewport checks do not replace physical iPhone/Android testing. Real keyboard and safe-area behavior still need a hardware check; the dialogs use safe-area offsets and dynamic viewport sizing. An additional stabilization pass removed imperative viewport resize writes and dialog transforms; repeated clicks now preserve frame dimensions. Reduced-motion behavior is implemented in CSS.

## Live stabilization check

The deployed site preserved an 860×672 frame during eight alternating Normal/Mini size selections. Each click selected its intended size. A full box preserved Kinder ×1, Belgian ×2 and Lotus ×1, calculated EGP 295 and disabled further additions. The combined payment/dialog suite now passes all 94 tests. See `live-box-desktop.png`, `stable-box-mobile.png` and `stable-box-320.png`.
