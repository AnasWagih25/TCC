---
name: The Cookie Concept
description: A warm confectionery shop window, expressive in type and calm in use.
colors:
  ink: "#492b22"
  muted: "#725749"
  paper: "#faf3ef"
  surface: "#fffbf8"
  blush: "#f2d6cf"
  rose: "#a64d50"
  line: "#decdc3"
  ink-deep: "#332017"
  commerce-hover: "#674137"
  panel: "#f0e7da"
  review-surface: "#f1e6df"
  photo-ground: "#f0e4d6"
  rating: "#995e35"
  error: "#94332d"
  error-surface: "#f6e0d9"
  disabled: "#e0d7cc"
typography:
  emailBody:
    fontFamily: "Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "Ahsing, Georgia, serif"
    fontSize: "clamp(3.5rem, 5.7vw, 5.1rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Ahsing, Georgia, serif"
    fontSize: "clamp(2.7rem, 4.4vw, 4.2rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  field: "8px"
  compact: "10px"
  card: "12px"
  image: "14px"
  dialog: "16px"
  pill: "50px"
  circle: "50%"
spacing:
  compact: "8px"
  field-gap: "20px"
  heading-gap: "44px"
  section: "116px"
  section-tablet: "80px"
  section-mobile: "72px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 11px 10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ink-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 11px 10px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.blush}"
    textColor: "{colors.ink}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "8px 0"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "9px 17px"
  filter-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  review-card:
    backgroundColor: "{colors.review-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "25px"
  cake-stage:
    backgroundColor: "#eedad0"
    rounded: "19px"
  cake-thumbnail:
    backgroundColor: "{colors.surface}"
    rounded: "12px"
    width: "56px"
    height: "56px"
---

# Design System: The Cookie Concept

## Overview

**Creative North Star: "Confectionery shop window"**

Warm paper, chocolate lettering and real bakery photography create a generous, inviting shop window. The supplied Ahsing display face supplies the personality; Outfit makes browsing, ordering and staff work clear. Blush and rose introduce restrained confectionery color without competing with the food.

Expressive headings and product imagery carry the storefront. The same palette becomes quieter in forms, checkout and administration: labeled controls, explicit selection, tonal panels and direct feedback. This direction was established under the user's delegated visual judgment; it is the implemented visual system, not a separate proposed identity.

**Key Characteristics:**
- Expressive Ahsing headings with calm Outfit interface text.
- Warm continuous paper, chocolate ink and restrained blush and rose accents.
- Real product photography, generous section rhythm and compact rounded surfaces.
- Clear ordering controls, visible keyboard focus and brief, optional motion.

Source of visual truth: `src/app/taste.css`, loaded after `src/app/redesign.css` and `src/app/globals.css`, plus the rendered component structure. The frontmatter records recurring implemented values; the sidecar holds motion, depth, breakpoints and component previews. Legacy aliases in CSS resolve to these redesign tokens rather than the superseded global palette.

## Colors

The palette feels like paper packaging, baked chocolate and a small confectionery accent. Frontmatter values are normative.

### Primary
- **Chocolate Ink** (`ink`): primary text, primary actions, selected filters and the announcement strip.
- **Deep Chocolate** (`ink-deep`): storefront primary-action hover.
- **Warm Chocolate Hover** (`commerce-hover`): retained commerce button hover; this is a distinct implemented variant.

### Secondary
- **Soft Blush** (`blush`): cake choices, bag count, secondary-action hover and selected checkout choices.
- **Baked Rose** (`rose`): selected display lines, keyboard outlines, carets and focused field borders.

### Neutral
- **Warm Paper** (`paper`): the continuous page ground and inverse primary-action text.
- **Fresh Cream** (`surface`): fields, dialogs and staff cards.
- **Muted Chocolate** (`muted`): secondary text, hints and placeholders. Preserve this final accessible text token rather than the earlier provisional value.
- **Warm Line** (`line`): quiet boundaries and field strokes.
- **Packaging Panel** (`panel`): cart summary, contact form and supporting tonal panels.
- **Review Paper** (`review-surface`): review cards, review forms and submission acknowledgement.
- **Biscuit Ground** (`photo-ground`): product-image fallback surfaces and the bakery ribbon.
- **Disabled Paper** (`disabled`): disabled commerce actions, paired with muted text and reduced opacity.

Semantic accents are **Toasted Star** (`rating`) for selected/reported stars and **Error Ink / Error Paper** (`error`, `error-surface`) for form alerts. Toast errors retain their own implemented darker red in the component CSS; do not apply the rating color to unrelated decoration.

**The Paper Ground Rule.** Keep the page ground continuous; use tonal panels or warm boundaries where a task needs grouping.

## Typography

**Display Font:** Ahsing, with Georgia and serif fallbacks. **Body Font:** Outfit, with sans-serif fallback. Both are supplied locally and use font-display swap; Outfit exposes weights from 100 to 900.

The rounded, expressive display face makes short headings recognizable. Outfit handles product names, prices, body copy, navigation, labels and dense staff information.

### Hierarchy
- **Display:** the storefront headline uses the frontmatter display role. On phones it changes to `clamp(3.2rem, 9.5vw, 4.5rem)` with line-height (1.08).
- **Headline:** shared editorial section headings use the headline role. On phones they use `clamp(2.45rem, 8vw, 3.7rem)`; route-specific headings retain their own observed sizes.
- **Title:** the product name defines the title role. Other Outfit headings vary with context; review titles use a slightly looser line-height (1.3).
- **Body:** base body uses the frontmatter role. Supporting prose commonly steps to (13–15px) and line-height (1.75–1.9); hero copy uses (16px / 1.75).
- **Label:** form labels use the label role. Navigation and primary actions use (13px), with primary actions at weight (500) and line-height (1.4). Small metadata uses (10–12px).

**The Two Voices Rule.** Reserve Ahsing for display headings and wordmarks; use Outfit for controls and information that must scan quickly.

Transactional email uses Arial body text and Georgia headings as explicit email-client fallbacks. Email clients cannot reliably load the storefront's local web fonts. The admin dashboard continues to use Ahsing for short page headings and Outfit for all operational information and forms.

Display headings balance their wrapping, paragraphs use pretty wrapping, and bounded copy columns prevent long spans of small text. Tabular figures are explicitly used for bag counts and staff statistics.

## Layout

The storefront uses a centered 1300px / 92% container. Its cinematic hero centers a two-line heading above primary menu and secondary story actions. A physical photo stage uses `object-fit: contain`, reserving 325px on desktop and a responsive height on mobile. The full cake remains visible. The toolbar offers actual catalog previews and direct links to the selected cake. Failed optimized images retry directly before using a local fallback; data and blob images share the same fill layout.

The featured menu pairs a pinned introduction with a dense two-column grid: one product spans both columns, with two beneath. At 1050px and below the title stops pinning; below 760px products become one column. Story imagery uses a bounded scroll scale. Ordering becomes a horizontal heading plus a vertical list of real steps. Reviews keep their true submission and moderation states.

Navigation floats within the page margin, with a native system/light/dark appearance selector on desktop and a direct light/dark switch on mobile. Mobile navigation uses a morphing two-line menu button and staggered destinations. Page slugs, primary navigation labels, ordering controls and reviews remain unchanged. Forms stack on phones, and product dialogs retain focus handling and dynamic-height limits.

## Elevation & Depth

The finishing layer in `src/app/polish.css` adds a faint paper texture and serving-plate rim behind the hero cake, one small scalloped paper edge below the story section, and a symbolic photo/message keepsake illustration in the reviews empty state. These are static, non-interactive details derived from the existing theme tokens. Photos receive a quiet inset edge; primary actions and task panels receive soft surface highlights. Keep these details sparse and preserve the established layout and type scale.

Tonal layers, photographs and generous spacing provide most of the depth. Product cards and ordinary content stay flat; their image, title, description and action are not nested inside a raised shell. The review cards and task panels use color rather than shadow.

Shadows identify the mobile menu, cake stage, toast and modal. Their exact values live in the sidecar. The modal adds a warm translucent backdrop with blur (5px); the photo lightbox uses a darker backdrop so the photograph remains legible.

**The Flat Content Rule.** Keep product and ordinary content surfaces flat; reserve prominent elevation for overlays and transient feedback.

## Shapes

The frontmatter corner vocabulary follows the implementation: compact field corners, slightly softer product imagery and panels, and larger dialog corners. Review cards and staff cards use the card radius. Primary actions and filters are pills; icon buttons and bag counts are circular.

The hero now uses nested, rounded image-stage surfaces rather than an arched crop. Thumbnails share a 12px shell, with selected state communicated by a border and aria-pressed. Catalog photography remains in rounded rectangular windows. No stamps or decorative labels overlap the hero photograph.

## Components

### Buttons

Tactile, direct pills pair a clear verb with a small arrow well. The primary storefront variant uses the primary frontmatter tokens, a minimum height (54px), gap (24px) and an inner circular arrow well (32px). Hover deepens its background and moves the arrow well diagonally (2px). Retained commerce primary buttons use their separate warm hover and rise (1px). Secondary buttons are transparent with a warm line; hover fills with blush. Text actions use an underline and move their arrow diagonally (2px).

Icon buttons provide at least (44px) in both dimensions. Button press feedback scales to (0.98). Disabled buttons reduce opacity to (0.5) and show a not-allowed cursor; commerce actions also use the disabled palette. Keyboard focus uses a rose outline (2px) with offset (5px).

### Chips

Quiet outlined pills become chocolate-filled with paper text when selected. Selection is communicated through `aria-pressed`, not color alone. Chips have a minimum height (40px) and wrap rather than forcing a wide page. On phones their text and padding reduce slightly. There is no separate chip-hover color in the redesign; preserve the global press and focus feedback.

### Cards / Containers

Product cards stay transparent, borderless and unraised. Their images crop to cover inside compact rounded windows; details and prices sit beneath. The featured image scales to (1.045) on hover over (650ms). Catalog images use their existing slider controls and product dialogs.

Review cards use the review surface, card radius and frontmatter padding, reduced to (23px) on phones. Long titles, text and author details wrap. Customer-photo thumbnails crop to cover and scale to (1.05) on hover; opening one shows the full image in a native dialog. Preview snippets use placeholder labels, never invented customer proof.

Cart summaries and contact forms use packaging-colored panels. Staff cards use fresh cream with warm borders and no shadow. Keep grouping appropriate to the task rather than repeating nested card shells.

### Inputs / Fields

Ordinary labeled fields use the frontmatter field tokens, a warm border (1px), minimum height (48px), full available width and text at (16px). Placeholders use muted chocolate. Focus shifts applicable input/textarea borders to rose; all fields receive the shared keyboard outline. Textareas resize vertically. Menu search is a separate border-bottom treatment with a minimum height (44px).

Form alerts pair error ink and error paper, rounded corners and `role="alert"`. Review submission shows preparation, saving, validation failure and confirmed acknowledgement. Failed or uncertain writes retain content; an uncertain prepared submission locks its content for an identical retry. Disabled upload labels are dimmed and use a wait cursor. Preserve these explicit states rather than decorating a successful-only form.

### Navigation

The Ahsing wordmark anchors an otherwise calm Outfit header. Desktop destinations underline on hover and when `aria-current` marks the active route. The bag count is a small blush circle. Mobile destinations use larger rows and rose for the active route; the menu closes with Escape or destination selection. The skip link becomes visible on keyboard focus.

### Cake selection, appearance and motion

The hero supports keyboard-operable previews of actual cookie cakes. Its promotion appears through an explicit “A little treat” action on desktop and mobile. Clipboard feedback remains inline. Appearance defaults to the system and can be explicitly set to light or dark; both use semantic tokens for text, surface, panels, buttons and forms.

The shared control curve remains cubic-bezier(0.16, 1, 0.3, 1). GSAP with its React integration orchestrates the brief hero entrance, desktop menu-title pinning, and bounded story-image scale. It uses scoped cleanup and matchMedia to remove pinning and transforms for reduced motion. Standard secondary section reveals remain lightweight IntersectionObserver/WAAPI. No scroll position is stored in React state.

Product/box dialogs lock background scroll, contain keyboard focus, close with Escape and restore prior focus. Review photos use the native dialog behavior and a dynamic viewport height limit. Review filtering, image preparation, preview removal and moderation states are implemented in the UI; production cloud rules, staff claims and authorized write/moderation verification remain outstanding as described in `REVIEWS_SETUP.md`.

## Do's and Don'ts

The bakery workspace uses these same paper, chocolate, blush and semantic theme tokens. Ahsing is reserved for short headings and the wordmark; Outfit handles tables, metrics and controls. Its dedicated header and desktop sidebar become a five-item navigation grid on phones, with an immediate light/dark switch. Order details, product editing and photo cropping use focus-contained native dialogs. Data states are part of the interface: live/cached connections, incomplete historical records, uncertain saves, notification failures and recoverable archives remain visible. The workspace styles are scoped to the admin route in `src/app/admin/admin.css`.

### Do:
- **Do** use actual catalog photography, prices and stored customer submissions.
- **Do** preserve the warm paper ground, the final muted text token and the Ahsing/Outfit role split.
- **Do** keep ordering choices explicit, labeled and visibly selected.
- **Do** preserve keyboard focus, browser zoom, reduced motion and complete loading, empty, failure and retry states.
- **Do** verify review deployment permissions and cloud behavior using `REVIEWS_SETUP.md` before production launch.

### Don't:
- **Don't** invent ratings, endorsements, sales counts or verified-purchase claims.
- **Don't** restore decorative polka dots, repeated waves or blocking loading intros from the superseded visual treatment.
- **Don't** put Ahsing on dense controls or add shadows to ordinary product cards.
- **Don't** hide content until an animation runs or add continuous decorative rotation.
- **Don't** treat a local UI check as proof that cloud review submission or staff publishing is deployed.
