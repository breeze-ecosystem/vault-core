# Phase 5 — Plan 05 User Setup: Crisp Chat Widget

**Service:** Crisp.chat — In-app customer support chat widget

**Why:** Provides a lightweight embedded chat widget for the vault-app support page at `/support`

**Status:** Incomplete

---

## Account Setup

1. **Create a Crisp account** at https://crisp.chat
2. **Create a new website** in the Crisp dashboard
3. **Get your Website ID** from Crisp Dashboard → Website settings → Website ID

---

## Environment Variable

Add to vault-app `.env`:

```env
NEXT_PUBLIC_CRISP_WEBSITE_ID=your-website-id-here
```

**Note:** The widget will not load if this variable is not set. The `CrispWidget` component handles this gracefully by returning `null`.

---

## Verification

1. Start vault-app dev server: `cd /home/devuser/projects/vault-app && npm run dev`
2. Visit `http://localhost:3200/en/support`
3. The Crisp chat widget should appear in the bottom-right corner
4. The widget locale should match the page locale (e.g., French on `/fr/support`)
