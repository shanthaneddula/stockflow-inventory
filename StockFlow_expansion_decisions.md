# StockFlow Expansion Decision List

## Review Basis

The current file contains 706 catalog records across Geek Bar, Lost Mary, Foger, Crown Bar, Starbuzz, Olit, and Fifty Bar. The records are embedded in the HTML and currently all have `brand`, `series`, `edition`, `flavor`, `puff_count`, `nicotine`, `product_type`, `sort_order`, and `active` fields.

The current runtime is intentionally simple: the catalog is the source of truth, quantities are keyed by item ID in localStorage, and the review/export pipeline derives rows from the catalog. The most important existing anchors are the storage block, `validateCatalog`, the Brand -> Series -> Edition -> Flavor renderers, `computeOrder`, `allOrders`, `renderReview`, and the CSV/PDF functions in `StockFlow_Mobile_Inventory-3.html`.

## Part 1: Data Architecture

### 1. Put Category above Brand in the working navigation

**Decision:** Use `Category -> Brand -> Product family -> Variant/item` as the default browse path. Treat the current `series` and `edition` labels as displayable hierarchy levels, not mandatory semantic types.

**Why:** In a stockroom, the first question is usually what kind of stock is being checked: vapes, pouches, tobacco, glass, or accessories. Category prevents a long mixed brand list and gives each category a vocabulary that fits its products. It also keeps a brand that later sells several product types from becoming a confusing cross-category entry point.

Keep a global search and a quick "recently counted" or "needs restock" path available so a buyer who thinks in brands or already knows an item does not have to walk the whole hierarchy. This is the one genuine tension: category-first is clearer for stock counts, while brand-first is faster for a brand-loyal buyer. Category-first should win as the default because the current app is an inventory workflow, not a retail storefront.

### 2. Use a stable item envelope plus typed category attributes

**Decision:** Keep a small common item envelope and put product-specific facts in a category-owned attributes object. Do not make every possible field part of every record, and do not use an untyped flat key-value list as the primary model.

The common envelope should cover:

- Stable `id`, display name, category, brand, optional family/series, optional edition, active status, and sort order.
- A human-readable item label that can stand alone when there is no flavor.
- Inventory policy and stock values: current, required/par, ordering unit, pack conversion, and optional manual order override.
- Optional supplier, barcode, cost, location, notes, and verification status for future catalog administration.

Category attributes should be typed and owned by a category definition. Examples:

- Vape: flavor, puff count, nicotine, product type, and device/form factor.
- Nicotine pouch: flavor, strength value, strength unit, pouch format/moisture, and can or box quantity.
- Glass: product type, dimensions/size, material, connection/style, and color where relevant.
- Roll-your-own: variety/style, cut type, net weight with unit, package form, paper inclusion, and tobacco classification.
- Hookah/accessory or culinary products: item type, size/quantity, material or cylinder specification, and compliance metadata where needed.

At render time, a category definition supplies field labels, formats, search aliases, and which fields are visible. A typed object is safer than arbitrary key-value pairs because numeric values, units, required fields, and export ordering remain predictable. The category definition still makes a fifth category additive rather than a whole-catalog rewrite.

Do not force `flavor` to exist. Use a generic `itemName` or `variantName` for the primary label, with `flavor` as an optional category attribute. A glass item should never display a blank flavor placeholder.

### 3. Make ordering policy data, not brand logic

**Decision:** Store a per-item ordering policy that converts the displayed stock unit into the supplier ordering unit. Keep current and required quantities in the unit the employee counts, then calculate order quantity through the policy.

The policy needs these concepts:

- `stockUnit`: what is counted on the shelf, such as piece, can, pouch, box, pouch, bag, or cartridge.
- `orderUnit`: what the supplier accepts, such as piece, box, carton, sleeve, or case.
- `unitsPerOrderUnit`: conversion quantity, such as five devices per box.
- `minimumOrderUnits` and optional `orderMultiple`: support minimums and case multiples without hardcoding a brand.
- `reorderMode`: normally required minus current, with optional minimum-stock or target-stock behavior.
- Optional manual override that always wins for a specific count.

The app should calculate in base counted units, then display both the unit-aware quantity and the supplier quantity. For example, five cans per sleeve should not be represented as an unexplained order of 5; it should say 5 cans, or 1 sleeve, according to the selected output.

Olit's current rule should migrate into item policy data, not remain an `if brand === "Olit"` branch. Glass pieces generally use piece-for-piece ordering. Pouches may count cans and order sleeves or cases. Tobacco may count bags or pouches and order cartons. Different SKUs within the same category can legitimately have different policies.

The automatic suggestion should remain `max(0, required - current)` as the default. Minimum-stock rules should be explicit policy data, because silently applying a category minimum can create unexpected purchase quantities.

### 4. Migrate vape records by enrichment, never by replacement

**Decision:** Preserve every existing vape ID byte-for-byte and enrich each record with `category: "vape"`. Preserve the current Brand, Series, Edition, Flavor values and all existing descriptive values. Add default ordering policy based on the already-supported behavior.

Migration sequence:

1. Ship a catalog normalizer that recognizes an old record as a vape when `category` is absent and the old vape fields are present.
2. Add `category: "vape"` and map the existing fields into the new attributes area while retaining legacy top-level aliases during the compatibility period.
3. Assign an ordering policy equivalent to today's behavior. Encode Olit's piece/minimum rule as policy data, and verify the intended box conversion for every other existing item before applying it.
4. Keep `STORE_KEY` and the ID-based quantity keys stable. Existing `current`, `par`, and `orderOverride` values must be copied, not recalculated or discarded.
5. Version the catalog schema separately from the quantity-store schema. Migrate once, write a backup, and make the migration idempotent.
6. Keep the old store key as a recovery source until a successful normalized write has been confirmed. Never delete it as part of the first release.

The user-visible migration must report how many records were normalized and whether any IDs were unmatched or duplicated. The existing 706 records should remain addressable by the same IDs after migration, including saved quantities from both the current and legacy localStorage keys.

Do not use a new generated ID from a composite label. Names, punctuation, and edition changes are not reliable identity.

### 5. Protect every downstream surface from vape assumptions

**Decision:** Introduce one normalized row/view model for search, review, CSV, and print output. Each surface should consume that model rather than reading `flavor`, `puff_count`, or `nicotine` directly.

Specific break risks to resolve:

- **Validation:** `validateCatalog` currently requires brand, series, edition, and flavor. Make hierarchy fields optional where the category allows it, require only the common envelope plus category-defined fields, and report missing or unverified category attributes separately from malformed records.
- **Navigation:** `selectSeries`, `selectEdition`, and `flavorList` assume every item belongs to a flavor run. Support a direct item list for one-off glass/accessory SKUs and rename the conceptual detail screen to Item Detail or Count Item.
- **Search:** Current search only searches brand or series at separate levels. Search the item label, brand, family, edition, category, SKU, barcode, and normalized attribute text. Index numeric values with their units so `6mg`, `14mm`, and `40g` can be found intentionally.
- **Detail rendering:** `renderFlavor` directly concatenates puff and nicotine labels. Replace that with category-defined attribute rows and omit empty fields. Keep the stock controls independent from descriptive metadata.
- **Review:** `allOrders` should return category, item label, SKU, counted unit, order unit, current, required, and order values. Review should group or filter by category and show units, not always say "Flavor" or "total units".
- **Full catalog CSV:** The current full-catalog export calculates `order` as `par - current`, which bypasses `computeOrder` and already disagrees with the Olit rule. Route both exports through the same order calculator and include category, item label, SKU, stock unit, order unit, conversion, and serialized or flattened attributes.
- **CSV schema:** Use stable common columns followed by category-specific columns or a clearly named attributes column. Include a schema/version field in backup data, and preserve unknown attributes during import/export rather than silently dropping them.
- **PDF/print:** Replace fixed Brand/Series/Edition/Flavor columns with category-aware item label and attributes. Keep a compact default table and include only attributes relevant to the selected scope. Show order quantities with their units and conversions.
- **Scope selectors:** Add Category to PDF scope filtering and make brand/series/edition choices dependent on category. A series is not guaranteed to exist for accessories.
- **Backup/restore:** Restore must preserve unknown future category attributes and policy fields. Validate IDs and shape before replacing state; do not erase valid saved quantities just because a newer catalog has different descriptive fields.
- **Catalog integrity:** Duplicate IDs, absent labels, missing category definitions, unverified source entries, and unsafe/regulated product metadata should be distinct warnings. The current warning only checks old vape-shaped completeness.

The expansion notes contain several incomplete or research-derived entries, including FUM device options without a complete SKU structure, an Olit placeholder flavor, and broad accessory/propellant lists. Mark those as draft or unverified catalog records until a concrete sellable item, stable ID, and ordering unit are confirmed. Do not turn prose descriptions into inventory SKUs automatically.

## Part 2: Visual and Interaction Direction

### 1. Use a category tile home screen, with a persistent quick path

**Decision:** Make the first inventory screen a compact grid of large category tiles, followed by brands within the selected category. Do not use a segmented control as the primary category selector.

Tiles should be highly scannable at arm's length: a short category name, item count, and restock count, with strong neutral treatment and one restrained category tint. Keep the grid to the number of active categories that fits without scrolling awkwardly; use a vertical list if a future category count makes the tile grid too dense.

A segmented control is excellent for switching between two or three stable modes, but it becomes cramped and ambiguous as categories grow. The tile grid gives each category a clear target and supports the Adidas-like block structure without turning the home screen into a marketing hero. Add a global search and a Review/Restock shortcut in the header or bottom action area for users who know the brand or need the urgent list first.

### 2. Use one accent system with restrained category tints

**Decision:** Use black, white, and cool gray as the structural palette, with one shared accent for actions and status. Give categories subtle tint tokens for tiles and selected states, but do not give each category a separate full UI theme.

A single action accent preserves orientation and makes primary actions predictable. Category tints can distinguish vape, pouch, tobacco, glass, and accessory inventory at a glance, especially on the category screen and breadcrumb, but they should remain pale surfaces or small indicators. Avoid saturated category colors, gradients, heavy shadows, and color as the only status signal. Restock urgency still needs text, icons, or labels in addition to color.

### 3. Use a system-font scale with bold navigation and calm counting

**Decision:** Stay system-font-based and use a deliberate Apple-like scale:

- Category title: 32px, bold or heavy.
- Brand/family headings: 24 to 28px, bold.
- Item/detail title: 22 to 26px, bold, allowed to wrap.
- Attribute labels: 12px, semibold, uppercase only when short.
- Body and control text: 16 to 17px, regular or semibold.
- Supporting metadata: 13 to 14px, muted.
- Quantity values: 40 to 48px, bold, with stable control dimensions.

Use SF Pro or the platform system stack where available. The confidence should come from weight, scale, spacing, and alignment rather than decorative type. Detail screens should lower the visual volume so the current quantity and required quantity remain the dominant objects.

### 4. Make the detail screen a counting tool, not an attribute form

**Decision:** Keep one reusable Count Item screen with three zones: identity, a short attribute summary, and stock controls. Show only the two or three most decision-relevant attributes by default; place the rest behind a compact "Details" disclosure or sheet.

The identity zone should show category, brand/family, item label, and SKU when useful. The attribute summary should use concise labeled values such as `6mg`, `40g`, `14mm`, or `Borosilicate glass`, never empty placeholders. The stock zone should keep Current, Required, and Order Quantity visually dominant and always use the item's count/order units.

Use the same large stepper and direct numeric entry interaction across categories. For one-off glass items, remove flavor language entirely. For pouch strengths or tobacco weights, show the attribute as context, not as another control unless it is genuinely being counted. Keep secondary editing, notes, and supplier details in a sheet.

The only deliberate tradeoff is whether all attributes should be visible for verification. Showing everything helps catalog cleanup but harms repeated counting. Counting should win on the primary screen; a details disclosure and catalog warning can preserve verification without making every scan a form.

### 5. Use bottom navigation for destinations, breadcrumbs for hierarchy, and color only as reinforcement

**Decision:** Keep four bottom destinations: Inventory, Review, Search, and More. Use a compact breadcrumb or back-context row above the detail title to show Category / Brand / Family / Item. Do not rely on category color alone for orientation.

Bottom navigation is appropriate for stable destinations and should not represent every hierarchy level. Breadcrumbs answer the local question "where am I?" and give a reliable back action at four levels deep. On very small screens, collapse the breadcrumb to the immediate parent plus a category badge, with the full path available in the back sheet or title context.

The current Previous/Next flow is useful for counting a long flavor run and should remain within a selected family/edition. It should not silently jump across unrelated categories or one-off item groups. Review and restock actions should remain reachable without abandoning the current count.

## Build Brief Acceptance Checks

Before implementation is considered complete, verify the following with a copy of a real saved store:

1. All 706 current records remain present with the exact same IDs.
2. Existing current, required/par, and manual override values are unchanged after first load and reload.
3. Olit behavior is identical after its rule is moved into ordering policy data.
4. Category-specific records can render without a flavor, puff count, or nicotine value.
5. Search finds a category-specific attribute and an item with a multi-word label.
6. Review, filtered PDF, restock CSV, and full-catalog CSV agree on order quantities and units.
7. Unknown attributes survive backup and restore.
8. A catalog with a new fifth category can be added through a category definition and records without changing the quantity model.
9. Unverified source notes are visible as catalog warnings and are not silently treated as confirmed SKUs.
10. Mobile touch targets, wrapped names, long attribute values, and four-level orientation remain usable at phone width.
