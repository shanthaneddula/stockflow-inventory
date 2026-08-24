You are acting as both an inventory systems architect and a product designer
for StockFlow, a single-file mobile-friendly HTML inventory/restocking app
currently used for one product category: disposable vapes.

CURRENT STATE
The app's data model is: Brand → Series → Edition/SKU → Flavor, with each
item carrying: puff_count, nicotine, product_type. Navigation is four screens
deep (Brands → Series → Editions → Flavor detail), plus a Review/Restock
screen, CSV/PDF export, and localStorage persistence. No login, no backend,
no build process — it's one HTML file opened directly on a phone.

THE CHANGE
I'm expanding beyond disposable vapes into additional categories:
- Nicotine pouches (brand, strength/mg, flavor, can/box pack size)
- Glass accessories (brand, product type, size, material — no flavor,
  no nicotine, often unique/low-stock items rather than flavor runs)
- Rolling / roll-your-own tobacco (brand, cut type, weight, papers vs.
  loose tobacco vs. kits)

These categories don't share the same attributes as vapes. A glass pipe
doesn't have a "flavor" or "nicotine %." A tobacco pouch doesn't have a
"puff count." I need the app to handle all of this without becoming a mess
of unused or repurposed fields, and without breaking the vape data and
restock workflow that already works.

PART 1 — DATA ARCHITECTURE
Recommend how to restructure the data model so it supports categories with
genuinely different attributes, while keeping one consistent restocking
workflow (Current / Required / Order quantity, or box-based ordering) across
all of them. Specifically address:

1. Where does "Category" sit in the navigation hierarchy — above Brand, or
   is it better modeled a different way? Justify it against how someone
   actually shops: does a wholesaler buyer think "I need to check vapes"
   first, or "I need to check Brand X" first, regardless of what Brand X
   sells?
2. How should category-specific attributes (nicotine %, puff count, glass
   material, tobacco cut/weight, pack size) be stored so that adding a
   fifth category later doesn't require restructuring the whole catalog
   again? Should attributes be a fixed schema per category, or a flexible
   key-value list rendered dynamically based on category?
3. Does the reorder-quantity model (boxes of 5 for vapes, Olit's per-piece
   rule) generalize across categories, or does each category need its own
   ordering unit (e.g., glass accessories ordered per unique piece like
   Olit, tobacco ordered by carton, pouches ordered by can-box)? Recommend
   a single flexible mechanism rather than one-off hardcoded rules per
   category if possible.
4. How should the existing 700+ vape SKUs migrate into the new structure
   without any data loss, ID changes, or disruption to a person's already-
   saved current/par quantities in localStorage?
5. Flag anything in this restructure that could silently break search,
   CSV/PDF export, or the Review/Restock screen, since those all currently
   assume a flavor-vape-shaped record.

PART 2 — VISUAL / INTERACTION DESIGN
I want the visual direction to read like a hybrid of the Adidas app/site
and Apple's Human Interface Guidelines. Specifically:

- From Adidas: bold, high-contrast typography; large blocky category tiles
  with strong image or color fills; confident use of black/white with a
  single accent color; minimal visual clutter; grid-based product browsing
  that feels retail and premium rather than utilitarian.
- From Apple HIG: generous whitespace and spacing rhythm; native-feeling
  controls (segmented controls, sheets, large touch targets, SF Symbols-
  style iconography); restrained, purposeful color use rather than
  decoration; clear typographic hierarchy (large bold titles, muted
  secondary text); subtle depth via blur/materials rather than heavy
  shadows; motion that feels responsive, not decorative.

Recommend, at a design-direction level (no code):
1. How the new top-level Category screen should look and behave — is it a
   grid of big tiles (Adidas-style), a segmented control at the top of the
   existing Brands screen, or something else? Justify against a phone screen
   at arm's length in a stockroom, not a marketing landing page.
2. A restrained color system: one neutral base (black/white/gray) plus how
   many accent colors, and whether accent color should vary by category
   (e.g., vapes vs. tobacco vs. glass each get a subtle color identity) or
   stay a single consistent accent throughout the app.
3. Typography direction: recommend a system-font-based scale (sizes/weights)
   that reads as confidently bold at the top level (category, brand) and
   calmer at the detail level (flavor/attribute screens), consistent with
   how Apple HIG scales Large Title down to Body/Caption.
4. How to keep the flavor/attribute detail screen (the core "count stock"
   screen people will use most) uncluttered as more attributes get added
   per category, without it turning into a dense form.
5. Whether bottom navigation, category color-coding, or breadcrumbs are the
   clearest way to keep someone oriented when they're four levels deep in
   a specific category/brand/series, especially on a small phone screen.

DELIVERABLE
Give me your recommendations as a decision list — one clear answer per
question above, with a short justification — not a menu of options. Call
out anywhere you're genuinely torn between two approaches and why, so I can
make that call myself. Do not write code or markup; this is a planning and
design-direction document I'll use to brief the actual build afterward.