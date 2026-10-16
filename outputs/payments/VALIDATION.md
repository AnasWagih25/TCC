# Deposit checkout verification — 16 October 2026

## Scope

Mandatory 50% InstaPay deposit or full InstaPay payment, private transaction screenshot upload, server OCR amount matching, accurate remaining balance, staff verification, order/email persistence and stable product/box dialogs.

## Local verification

- Production webpack build and TypeScript pass. OCR worker, both English/Arabic models and all six core variants are present in the function trace (approximately 85 MB). The existing metadataBase warning is unrelated.
- All 94 automated tests pass. They cover payment calculation/rounding, signatures/expiry, incorrect/missing proofs, reused screenshots, atomic order/stock/email writes, safe retries, legacy saved-order recovery, receipt privacy, staff verification, email and CSV details, English/Arabic amount extraction, negative/foreign/ambiguous amounts, MIME spoofing, animated images and origin checks.
- Browser testing used the actual production build on port 3100. A clearly marked synthetic EGP 32.50 receipt matched a 50% deposit for a EGP 65 order. A EGP 65 receipt matched full payment and automatically selected the full-payment option. EGP 99 was rejected with the required amounts shown. A changed promo total invalidated the earlier match and blocked checkout.
- Both cash and InstaPay balance methods worked. No Telda choice remains for new checkout/manual sales.
- Payment layouts tested at 320, 390 and 1440 pixels without page or payment-panel horizontal overflow.
- Dialog sizing remains stable over repeated size, extras and quantity clicks. Mobile 390/320 and desktop interaction checks cover correct selections, limits, totals and add-to-bag behavior.
- A public download attempt for the uploaded synthetic screenshot returned HTTP 403. Matching screenshots are private; incorrect scans are never stored.
- Temporary cart entries and four local-test synthetic screenshot objects were removed. No order, payment, stock reservation or email was created during this phase of browser testing. Fixture images explicitly say they are not real payments.

## Production verification

- The deployed site recognized the synthetic EGP 32.50 receipt as a 50% deposit for an EGP 65 total (HTTP 200, OCR confidence 94, 5.64 seconds). It recognized the EGP 65 receipt as full payment (HTTP 200, confidence 94, 4.46 seconds).
- The first deployment exposed a missing dynamic OCR-worker dependency. Explicit tracing now includes the four worker helper packages. A regression test copies only the traced assets into an isolated directory and successfully runs actual English/Arabic OCR without repository dependency fallback.
- Eight alternating Normal/Mini product-size selections on the live site preserved the same 860×672 dialog frame and selected the clicked option correctly. The live four-cookie box selected Kinder ×1, Belgian ×2 and Lotus ×1 for EGP 295 and disabled additions at capacity.
- The two successful live-test screenshot objects were deleted from private storage after verification. No live orders, stock reservations, customer emails or money transfers were created by these payment checks.

Physical iPhone/Android keyboard/safe-area behavior remains a hardware check. Screenshot OCR checks the displayed amount; only staff confirmation against the receiving account verifies real funds.

Screenshots: `deposit-mobile.png`, `full-payment-mobile.png`, and the dialog stabilization screenshots in `outputs/menu-dialogs/`, including `live-box-desktop.png` from production.

## Gemini scanning and rounded payments — 17 October 2026

- Google AI Studio key validated against Google's API and saved only in ignored local server configuration and a Vercel production Secret. It is absent from tracked source and compiled browser assets.
- Gemini 3.5 Flash-Lite returned a valid structured EGP 32.50 transcription from the synthetic test receipt. Gemini 3.8 Flash returned temporary capacity errors, so production uses the verified Flash-Lite model with supported low thinking.
- All 117 tests pass, including 14 isolated Gemini privacy/parser/provider-selection cases and rounding regressions across signed proofs, orders and staff confirmation. Targeted ESLint, TypeScript and the production build pass.
- Live rounded deposit: EGP 33.00 against EGP 32.50 required for an EGP 65 total returned HTTP 200, plan `deposit`, readability confidence 100, in 5.31 seconds. The live checkout displayed EGP 32.00 remaining and allowed the screenshot to satisfy the mandatory proof requirement.
- Live rounded full payment: EGP 65.00 against EGP 64.01 returned HTTP 200, plan `full`, confidence 100, in 3.41 seconds.
- Live underpayment: EGP 32.50 against EGP 32.51 required returned HTTP 422 in 5.84 seconds and no signed proof.
- Mobile checkout checked at 390×844: page scroll width equals viewport width, the payment panel fits and the rounded deposit match remains readable. Screenshot: `gemini-receipt-match-mobile.png`.
- The scanner extracts without the expected order amount, and the server independently validates the amount/currency/status before applying the exact-or-next-whole-EGP policy. Submitted amounts and balances use the actual scanned transfer, including in saved orders, admin review and emails.
- No live order, payment, stock reservation or customer email was created. Temporary bag selections and frontend receipt data were removed after verification. Physical-phone testing remains separate from these viewport checks.

Gemini confidence is a model readability estimate, not bank verification. Staff still confirms actual funds received; edited screenshots cannot be authenticated by amount extraction.

## EGP 5/10 rounding and shorter checkout copy — 17 October 2026

- Removed the Google processing paragraph and rounding explanation from checkout, including the rounding sentence in amount-mismatch errors.
- Shared validation now accepts exact amounts and ceilings to EGP 1, 5 or 10. A required EGP 192.50 deposit accepts EGP 195 or EGP 200, leaving EGP 190 or EGP 185 on an EGP 385 order. Underpayments and unrelated amounts still fail.
- The server promotes an initially selected deposit to full InstaPay payment when its verified screenshot amount covers the server-priced full total. Saved balances are zero, actual submitted amounts are preserved and staff confirmation is still required. A full-payment selection with only a deposit cannot be accepted.
- All 122 tests pass, including the shared policy, screenshot route, signed proof, order persistence and staff confirmation regressions. Targeted ESLint and production TypeScript checks pass.
- The remaining synthetic browser receipt from the preceding verification was identified by image-pixel comparison and all three QA markers, then removed from private storage. No customer records were changed.
