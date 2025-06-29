# Gating Component Refactor Plan

## 1. Executive Summary

**Problem:** The Universal Profile (UP) gating components, primarily `UniversalProfileRenderer.tsx`, are suffering from critical "Maximum update depth exceeded" errors. These are caused by a legacy, monolithic architecture with tightly-coupled state, rendering, and data-fetching logic, leading to uncontrollable infinite re-render loops.

**Solution:** We will refactor the entire UP gating system using a modern, standard React architecture that separates concerns. This will involve creating dedicated custom hooks for all business logic and small, "dumb" presentational components for all UI.

**Outcome:** A stable, performant, and maintainable gating system that is easy to debug, extend, and test. This will eliminate the current crashes and provide a solid foundation for future development.

---

## 2. The New Architecture: Logic vs. Presentation

The core principle of this refactor is the strict separation of concerns.

### A. Custom Hooks (The "Brains")

All complex logic will be extracted into single-purpose, reusable custom hooks. These hooks will be responsible for one thing only.

-   **Location:** `src/hooks/gating/up/`
-   **Examples:**
    -   `useUpLyxBalance(address)`: Fetches and returns the LYX balance for a given address.
    -   `useUpTokenVerification(address, tokenRequirements)`: Handles all LSP7/LSP8 token verification.
    -   `useUpFollowerVerification(address, followerRequirements)`: Handles all follower/following checks.
    -   `useUpSocialProfiles(addresses)`: Fetches and caches UP social profile metadata.

**Key Benefits:**
-   **Isolation:** Bugs are contained. A problem in token fetching won't crash the follower component.
-   **Testability:** Hooks can be tested independently of any UI.
-   **Reusability:** The same `useUpLyxBalance` hook can be used in the lock preview, the comment box, or anywhere else.

### B. Presentational Components (The "Beauty")

All UI rendering will be handled by small, simple React components that do nothing but receive props and display them. They will contain no state and no data-fetching logic.

-   **Location:** `src/components/gating/up/`
-   **Examples:**
    -   `LyxRequirementView({ required, actual })`: A simple component showing LYX balance status.
    -   `TokenRequirementView({ token, isVerified })`: A component to display a single token requirement.
    -   `FollowerRequirementView({ profile, isFollowing })`: A component to display a follower requirement.

**Key Benefits:**
-   **Predictability:** These components are "dumb." Given the same props, they will always render the same output.
-   **Maintainability:** Easy to update styles and layout without touching any logic.
-   **Storybook-Friendly:** Can be easily developed and showcased in isolation using Storybook.

### C. Container Components (The "Glue")

A small number of container components will be responsible for bringing the hooks and presentational components together.

-   **Location:** `src/components/gating/` (or similar high-level directory)
-   **Example:**
    -   `UniversalProfileGatingPanel`:
        1.  Takes the high-level `requirements` object as a prop.
        2.  Calls the various `use...` hooks to get the data (`lyxBalance`, `tokenVerificationStatus`, etc.).
        3.  Passes that data down to the simple presentational components (`LyxRequirementView`, etc.) for rendering.

---

## 3. The New Folder Structure

To support this clean architecture, we will adopt a more organized folder structure.

```
src/
├── components/
│   └── gating/
│       ├── up/                     // New: UP-specific UI components
│       │   ├── LyxRequirementView.tsx
│       │   ├── TokenRequirementView.tsx
│       │   └── FollowerRequirementView.tsx
│       └── UniversalProfileGatingPanel.tsx // The new container
│
└── hooks/
    └── gating/
        └── up/                     // New: UP-specific logic hooks
            ├── useUpLyxBalance.ts
            ├── useUpTokenVerification.ts
            └── useUpFollowerVerification.ts
```

---

## 4. Step-by-Step Refactoring Roadmap

We will tackle this incrementally, starting with the most problematic component.

**Phase 1: Refactor `UniversalProfileRenderer.tsx`**

1.  **Create New Hooks:**
    -   Create `useUpLyxBalance.ts`.
    -   Create `useUpTokenVerification.ts`.
    -   Create `useUpFollowerVerification.ts`.
    -   Migrate all relevant logic from `UniversalProfileRenderer.tsx` and `useUPVerificationData.ts` into these new hooks. Ensure they are fully self-contained.

2.  **Create New Presentational Components:**
    -   Create `LyxRequirementView.tsx`, `TokenRequirementView.tsx`, etc.
    -   Copy the JSX/UI code from the monolithic `UniversalProfileRenderer.tsx` into these smaller components.

3.  **Create the New Container:**
    -   Create `UniversalProfileGatingPanel.tsx`.
    -   Implement the container logic: call the hooks, pass props to the views.

4.  **Integration:**
    -   Replace the contents of `UPVerificationWrapper.tsx` with the new `UniversalProfileGatingPanel`. This will inject the new, stable system into the existing app without breaking anything else.

5.  **Cleanup:**
    -   Delete the now-unused `UniversalProfileRenderer.tsx`.
    -   Delete the now-obsolete `useUPVerificationData.ts`.
    -   Remove the render-counting instrumentation.

**Phase 2: Audit & Refactor Other Components (If Necessary)**

-   After the main component is stable, we will audit `InlineUPConnection.tsx` and other related components to see if they can be simplified by using the new hooks.

---

## 5. Success Criteria

We will know this refactor is complete and successful when:

-   The "Maximum update depth exceeded" error is **completely eliminated**, even when rapidly switching between different UP accounts.
-   The `[render]` counters in the console remain low and stable during all connection and verification flows.
-   The `UniversalProfileRenderer.tsx` file no longer exists.
-   The codebase is easier to understand, with a clear separation between logic and UI.
-   The build is clean, with no errors and only standard, non-blocking warnings. 