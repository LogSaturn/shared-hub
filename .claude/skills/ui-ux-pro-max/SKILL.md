---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use

- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, etc.)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces

### Recommended

- UI looks "not professional enough" but the reason is unclear
- Receiving feedback on usability or experience
- Pre-launch UI quality optimization
- Aligning cross-platform design (Web / iOS / Android)
- Building design systems or reusable component libraries

### Skip

- Pure backend logic
- API or database design
- Performance work unrelated to UI
- Infrastructure or DevOps
- Non-visual scripts

**Decision criteria**: If the task changes how a feature **looks, feels, moves, or is interacted with**, use this skill.

## Rule Categories by Priority

| Priority | Category | Impact | Key Checks (Must Have) | Anti-Patterns (Avoid) |
|----------|----------|--------|------------------------|------------------------|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels | Removing focus rings, Icon-only buttons without labels |
| 2 | Touch & Interaction | CRITICAL | Min size 44x44pt, 8px+ spacing, Loading feedback | Hover-only reliance, Instant state changes |
| 3 | Performance | HIGH | WebP/AVIF, Lazy loading, Reserve space (CLS<0.1) | Layout thrashing, CLS |
| 4 | Style Selection | HIGH | Match product type, Consistency, SVG icons (no emoji) | Mixing flat & skeuomorphic randomly, Emoji as icons |
| 5 | Layout & Responsive | HIGH | Mobile-first breakpoints, Viewport meta, No horizontal scroll | Horizontal scroll, Fixed px container widths |
| 6 | Typography & Color | MEDIUM | Base 16px, Line-height 1.5, Semantic color tokens | Text<12px body, Gray-on-gray, Raw hex in components |
| 7 | Animation | MEDIUM | Duration 150-300ms, Motion conveys meaning, Spatial continuity | Decorative-only animation, Animating width/height |
| 8 | Forms & Feedback | MEDIUM | Visible labels, Error near field, Helper text, Progressive disclosure | Placeholder-only label, Errors only at top |
| 9 | Navigation Patterns | HIGH | Predictable back, Bottom nav <=5, Deep linking | Overloaded nav, Broken back behavior |
| 10 | Charts & Data | LOW | Legends, Tooltips, Accessible colors | Color-only meaning |

## Quick Reference

### 1. Accessibility (CRITICAL)
- color-contrast: Minimum 4.5:1 ratio for normal text (large text 3:1)
- focus-states: Visible focus rings on interactive elements (2-4px)
- alt-text: Descriptive alt text for meaningful images
- aria-labels: aria-label for icon-only buttons; accessibilityLabel in native
- keyboard-nav: Tab order matches visual order; full keyboard support
- form-labels: Use label with for attribute
- skip-links: Skip to main content for keyboard users
- heading-hierarchy: Sequential h1->h6, no level skip
- color-not-only: Don't convey info by color alone (add icon/text)
- dynamic-type: Support system text scaling; avoid truncation as text grows
- reduced-motion: Respect prefers-reduced-motion
- voiceover-sr: Meaningful accessibilityLabel/accessibilityHint
- escape-routes: Provide cancel/back in modals and multi-step flows
- keyboard-shortcuts: Preserve system and a11y shortcuts

### 2. Touch & Interaction (CRITICAL)
- touch-target-size: Min 44x44pt (Apple) / 48x48dp (Material); use hitSlop if visual is smaller
- touch-spacing: Minimum 8px/8dp gap between touch targets
- hover-vs-tap: Use click/tap for primary interactions; don't rely on hover alone
- loading-buttons: Disable button during async operations; show spinner or progress
- error-feedback: Clear error messages near problem
- cursor-pointer: Add cursor-pointer to clickable elements (Web)
- gesture-conflicts: Avoid horizontal swipe on main content; prefer vertical scroll
- tap-delay: Use touch-action: manipulation to reduce 300ms delay (Web)
- standard-gestures: Use platform standard gestures consistently
- system-gestures: Don't block system gestures (Control Center, back swipe)
- press-feedback: Visual feedback on press (ripple/highlight)
- haptic-feedback: Use haptic for confirmations and important actions
- gesture-alternative: Always provide visible controls for critical actions
- safe-area-awareness: Keep primary touch targets away from notch, Dynamic Island, gesture bar
- no-precision-required: Avoid requiring pixel-perfect taps on small icons or thin edges
- swipe-clarity: Swipe actions must show clear affordance or hint
- drag-threshold: Use a movement threshold before starting drag

### 3. Performance (HIGH)
- image-optimization: WebP/AVIF, responsive images, lazy load non-critical
- image-dimension: Declare width/height or aspect-ratio to prevent layout shift
- font-loading: font-display: swap/optional to avoid invisible text (FOIT)
- font-preload: Preload only critical fonts
- critical-css: Prioritize above-the-fold CSS
- lazy-loading: Lazy load non-hero components
- bundle-splitting: Split code by route/feature to reduce initial load
- third-party-scripts: Load third-party scripts async/defer
- reduce-reflows: Avoid frequent layout reads/writes
- content-jumping: Reserve space for async content (CLS)
- lazy-load-below-fold: Use loading="lazy" for below-the-fold images
- virtualize-lists: Virtualize lists with 50+ items
- main-thread-budget: Keep per-frame work under ~16ms for 60fps
- progressive-loading: Skeleton/shimmer instead of long blocking spinners (>1s)
- input-latency: Keep under ~100ms for taps/scrolls
- tap-feedback-speed: Visual feedback within 100ms of tap
- debounce-throttle: Use debounce/throttle for high-frequency events
- offline-support: Provide offline state messaging
- network-fallback: Offer degraded modes for slow networks

### 4. Style Selection (HIGH)
- style-match: Match style to product type
- consistency: Use same style across all pages
- no-emoji-icons: Use SVG icons (Heroicons, Lucide), not emojis
- color-palette-from-product: Choose palette from product/industry
- effects-match-style: Shadows, blur, radius aligned with style
- platform-adaptive: Respect platform idioms (iOS HIG vs Material)
- state-clarity: Make hover/pressed/disabled states visually distinct
- elevation-consistent: Use a consistent elevation/shadow scale
- dark-mode-pairing: Design light/dark variants together
- icon-style-consistent: Use one icon set/visual language
- system-controls: Prefer native/system controls over fully custom
- blur-purpose: Use blur to indicate background dismissal, not decoration
- primary-action: Each screen should have only one primary CTA

### 5. Layout & Responsive (HIGH)
- viewport-meta: width=device-width initial-scale=1 (never disable zoom)
- mobile-first: Design mobile-first, then scale up
- breakpoint-consistency: Use systematic breakpoints (375 / 768 / 1024 / 1440)
- readable-font-size: Min 16px body text on mobile (avoids iOS auto-zoom)
- line-length-control: Mobile 35-60 chars per line; desktop 60-75
- horizontal-scroll: No horizontal scroll on mobile
- spacing-scale: Use 4pt/8dp incremental spacing system
- touch-density: Keep component spacing comfortable for touch
- container-width: Consistent max-width on desktop
- z-index-management: Define layered z-index scale
- fixed-element-offset: Fixed navbar/bottom bar must reserve safe padding
- scroll-behavior: Avoid nested scroll regions
- viewport-units: Prefer min-h-dvh over 100vh on mobile
- orientation-support: Layout readable in landscape mode
- content-priority: Show core content first on mobile
- visual-hierarchy: Hierarchy via size, spacing, contrast - not color alone

### 6. Typography & Color (MEDIUM)
- line-height: 1.5-1.75 for body text
- line-length: 65-75 characters per line
- font-pairing: Match heading/body font personalities
- font-scale: Consistent type scale (12 14 16 18 24 32)
- contrast-readability: Darker text on light backgrounds
- text-styles-system: Use platform type system (iOS Dynamic Type / MD type roles)
- weight-hierarchy: Bold headings (600-700), Regular body (400), Medium labels (500)
- color-semantic: Define semantic color tokens
- color-dark-mode: Desaturated/lighter tonal variants, not inverted
- color-accessible-pairs: 4.5:1 (AA) or 7:1 (AAA)
- color-not-decorative-only: Functional color must include icon/text
- truncation-strategy: Prefer wrapping over truncation
- letter-spacing: Respect default letter-spacing per platform
- number-tabular: Tabular figures for data columns, prices, timers
- whitespace-balance: Use whitespace intentionally to group related items

### 7. Animation (MEDIUM)
- duration-timing: 150-300ms for micro-interactions; complex <=400ms; avoid >500ms
- transform-performance: Use transform/opacity only; avoid width/height/top/left
- loading-states: Skeleton/progress when loading exceeds 300ms
- excessive-motion: Animate 1-2 key elements per view max
- easing: ease-out for entering, ease-in for exiting
- motion-meaning: Every animation expresses cause-effect, not just decoration
- state-transition: State changes animate smoothly, not snap
- continuity: Maintain spatial continuity across transitions
- parallax-subtle: Use parallax sparingly; respect reduced-motion
- spring-physics: Prefer spring/physics-based curves
- exit-faster-than-enter: Exit ~60-70% of enter duration
- stagger-sequence: 30-50ms per item in lists/grids
- shared-element-transition: For visual continuity between screens
- interruptible: User tap/gesture cancels in-progress animation
- no-blocking-animation: UI must stay interactive during animation
- fade-crossfade: For content replacement within same container
- scale-feedback: Subtle scale (0.95-1.05) on press
- gesture-feedback: Drag/swipe/pinch must track finger in real-time
- hierarchy-motion: Direction expresses hierarchy (down=deeper, up=back)
- motion-consistency: Unify duration/easing tokens
- modal-motion: Animate from trigger source for context
- navigation-direction: Forward left/up; backward right/down

### 8. Forms & Feedback (MEDIUM)
- input-labels: Visible label per input (not placeholder-only)
- error-placement: Show error below the related field
- submit-feedback: Loading then success/error state on submit
- required-indicators: Mark required fields
- empty-states: Helpful message and action when no content
- toast-dismiss: Auto-dismiss in 3-5s
- confirmation-dialogs: Confirm before destructive actions
- input-helper-text: Persistent helper text below complex inputs
- disabled-states: Reduced opacity (0.38-0.5) + cursor change
- progressive-disclosure: Reveal complex options progressively
- inline-validation: Validate on blur, not keystroke
- input-type-keyboard: Semantic input types (email, tel, number)
- password-toggle: Show/hide toggle for passwords
- autofill-support: autocomplete / textContentType attributes
- undo-support: Allow undo for destructive actions
- success-feedback: Brief visual feedback on completion
- error-recovery: Errors include clear recovery path
- multi-step-progress: Step indicator + back navigation
- form-autosave: Long forms auto-save drafts
- sheet-dismiss-confirm: Confirm before dismissing with unsaved changes
- error-clarity: Cause + fix, not just "Invalid input"
- focus-management: Auto-focus first invalid field on submit error

### 9. Navigation Patterns (HIGH)
- bottom-nav-limit: Max 5 items; labels with icons
- drawer-usage: Drawer/sidebar for secondary nav, not primary actions
- back-behavior: Predictable; preserve scroll/state
- deep-linking: All key screens reachable via URL
- tab-bar-ios: iOS bottom Tab Bar for top-level
- top-app-bar-android: Android Top App Bar with navigation icon
- nav-label-icon: Icon AND text label
- nav-state-active: Visually highlight current location
- nav-hierarchy: Primary vs secondary clearly separated
- modal-escape: Clear close/dismiss; swipe-down on mobile
- search-accessible: Easily reachable; recent/suggested queries
- breadcrumb-web: 3+ level deep hierarchies
- state-preservation: Restore scroll/filter/input on back
- gesture-nav-support: iOS swipe-back, Android predictive back
- tab-badge: Sparingly; clear after visit
- overflow-menu: When actions exceed space
- bottom-nav-top-level: Never nest sub-navigation
- adaptive-navigation: >=1024px sidebar; small bottom/top nav
- back-stack-integrity: Never silently reset
- navigation-consistency: Same placement across pages
- modal-vs-navigation: Modals not for primary navigation flows
- focus-on-route-change: Move focus to main content
- destructive-nav-separation: Visually separated from normal nav

## Stack Guidelines (React Native)

This project's only stack. Key practices:
- Use `Pressable` (not `TouchableOpacity`) for new code; provides more state hooks
- Use `react-native-safe-area-context` with `SafeAreaProvider` at root
- Use `FlatList` with `keyExtractor` and `getItemLayout` for long lists
- Avoid inline arrow-fns in render-hot paths (use useCallback)
- Use `react-native-reanimated` worklets for 60fps animations
- Respect `useSafeAreaInsets()` rather than hardcoded paddings
- Use `accessibilityLabel`, `accessibilityRole`, `accessibilityState` for a11y

## Project Conventions (vices)

- Spacing tokens live in `constants/spacing.ts` (xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, xxxl:64)
- Colors and typography in `constants/colors.ts`
- Always use SPACING tokens, not magic numbers
- All screens require SafeAreaProvider at the root layout
- Bottom sheets use `@gorhom/bottom-sheet` with `BottomSheetModalProvider`
- Compass page uses `react-native-reanimated` for needle/dial rotation

## Pre-Delivery Checklist (App)

### Visual
- No emojis as structural icons (use SVG / vector-icons)
- Icons from a consistent family
- Pressed-state visuals do not shift layout bounds
- Semantic theme tokens used (no per-screen hex hardcodes)

### Interaction
- All tappable elements provide press feedback within 80-150ms
- Touch targets >=44x44pt iOS, >=48x48dp Android
- Micro-interactions 150-300ms with native easing
- Disabled states clear and non-interactive
- Screen reader focus order matches visual order
- No nested/conflicting gestures

### Light/Dark Mode
- Primary text contrast >=4.5:1 in both
- Secondary text contrast >=3:1 in both
- Dividers/borders distinguishable in both
- Modal scrim 40-60% black

### Layout
- Safe areas respected for headers, tab bars, bottom CTA bars
- Scroll content not hidden behind fixed bars
- Verified on small phone, large phone, tablet (portrait + landscape)
- 4/8dp spacing rhythm at component, section, page levels

### Accessibility
- All meaningful images/icons have accessibility labels
- Form fields: labels, hints, error messages
- Color is not the only indicator
- Reduced motion + Dynamic Type supported

## CLI script (optional)

The skill ships with a `scripts/search.py` tool for searching the design database. It is not bundled here. To enable:
1. Clone https://github.com/anthropics/claude-code skills repo
2. Copy `skills/ui-ux-pro-max/scripts/` into this folder
3. `python3 scripts/search.py "<query>" --design-system`

Without the script, this SKILL.md serves as the reference checklist.
