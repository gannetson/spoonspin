# PLUS shopping-list transfer

Investigated on 2026-09-21. PLUS was removed from Spoonspin because we could not verify a working transfer of an entire shopping list. The previous implementation copied text and opened a product search for only the first ingredient.

## Evidence

- PLUS's [app FAQ](https://www.plus.nl/organisatie/faq-plus-app) describes manually adding products and free-text groceries within PLUS. It does not document importing external lists.
- The [affiliate programme](https://www.plus.nl/organisatie/affiliate) describes Awin referral links and directs integration questions to FamilyBlend. It does not provide a shopping-list payload contract.
- Tested the live PLUS recipe page for [Wortel-mango smoothie](https://www.plus.nl/recept/wortel-mango-smoothie-r-en0261). Its “Kies producten” button opens a product-selection sidebar; the recipe share links share the PLUS recipe URL, not an arbitrary ingredient list.
- Inspected PLUS's publicly served `ECOP.MainFlow.Cart.mvc.js` and `ECP_Cart_CW.Cart.CartContent.mvc.js`. The `/winkelwagen` page accepts `add` and `token` parameters and passes them as `ListOfProducts` and `Token` to its cart component. There is code for external-list availability handling behind a `FIU` release toggle. This is evidence of an external basket mechanism, so claiming PLUS has no import mechanism would be incorrect.
- Its public `ECP_Cart_BL.model.js` includes an `Aux_Product` model with `sku` and `q` fields. Tested an inferred JSON payload with two real catalogue SKUs (`203724` and `579021`, one unit each) in `add`, without a token, in a signed-out session with no store selected. The basket remained empty. The payload contract, token requirements, release-toggle state, and authenticated/store-selected behavior remain unverified; this test does not prove that partner integration is impossible.

## Requirement for restoring PLUS

Obtain a documented, authorized transfer contract from PLUS/FamilyBlend and verify it end to end with multiple products, quantities, login/store selection, unavailable items, and an existing basket. If the interface takes SKUs, Spoonspin also needs reliable ingredient-to-product matching and a way for the user to review choices and pack quantities. An Awin publisher ID alone does not establish that these requirements are met.

Until then, retain Spoonspin's editable shopping list, copy, native share, and WhatsApp features without a PLUS ordering claim or search-only substitute.
