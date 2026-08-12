# Phone Shepherd Visual System Audit & Conqify Family Fit

Audit date: August 12, 2026
Scope: read-only audit. **No design changes were made.** No CSS, components, layouts, typography, colors, icons, or branding were modified.

Codebase surveyed: 47 screens/components, ~6,900 lines of TSX, 43 `StyleSheet.create` blocks, 722 style keys, one theme file (`src/lib/theme.ts`).

> **Conqify availability caveat.** No Conqify / LifeOS repository is reachable from this session — the account exposes none through the repo listing. Everything below about Phone Shepherd is measured from source. Everything about Conqify is evaluated from the hypothesis **as stated in the brief**, not from its code. The recommendation holds regardless, but the specific shared-token values in Section 15 must be re-checked against Conqify's actual implementation before anything is agreed.

---

## 1. Typography

**No custom typeface.** Zero occurrences of `fontFamily`, `expo-font`, or `useFonts` anywhere in the project. The app renders in the platform system font — SF Pro on iOS, Roboto on Android. The visual identity therefore carries no typographic signature of its own.

The ramp is centralized in `src/lib/theme.ts:36-88` as 8 named steps plus a tab size:

| Token | Size / Line height | Ratio | Weight |
| --- | --- | --- | --- |
| `hero` | 42 / 46 | 1.10 | 800 |
| `title` | 32 / 38 | 1.19 | 800 |
| `subtitle` | 23 / 29 | 1.26 | 800 |
| `cardTitle` | 18 / 24 | 1.33 | 800 |
| `button` | 15 / 20 | 1.33 | 800 |
| `label` | 13 / 16 | 1.23 | 800 |
| `body` | 16 / 23 | 1.44 | 500 |
| `bodySmall` | 14 / 20 | 1.43 | 500 |
| `tab` | 11 | — | 700 (set at call site) |

Observations:

- **The weight vocabulary is binary and extreme.** Everything structural is `800`; body copy is `500`. There is no 400, 600, or 700 in the ramp. A six-step size scale carrying only two weights forces size to do all the hierarchy work.
- **`letterSpacing: 0` is explicitly declared on every step**, including the 13px `label` that functions as an eyebrow/kicker throughout the app — the one place tracking normally earns its keep.
- **Line-height ratios are optically reasonable but not systematic** (1.10 → 1.19 → 1.26 → 1.33 → 1.23 → 1.44). They were tuned per step rather than derived.
- **The ramp is bypassed in two places.** A 42/48/800 "score numeral" is hand-declared in `app/(tabs)/index.tsx:292` and again in `app/session/index.tsx:511`, rather than reusing `typography.hero` — which is 42/**46**, a 2px line-height drift between the token and its two copies.
- **Gaps in the scale.** Nothing sits between 18 and 23, or between 23 and 32. More importantly, there is **no long-form reading style at all** — no measure constraint, no dedicated prose leading. The ramp is built entirely for cards and headlines.
- **No Dynamic Type guards.** `allowFontScaling` and `maxFontSizeMultiplier` appear zero times, so system text scaling applies unbounded against fixed-height containers (see §13).

---

## 2. Color palette

15 tokens, **one theme, light only.** `app.json` pins `"userInterfaceStyle": "light"`, `app/_layout.tsx:15` hardcodes `<StatusBar style="dark" />`, and `useColorScheme` is never imported. There is no dark mode and no path to one.

**Surfaces — three warm whites separated by 1–2% luminance:**

| Token | Hex | Role |
| --- | --- | --- |
| `cream` | `#F7F3EA` | App ground (also splash background) |
| `card` | `#FFFCF4` | Default raised surface |
| `cardSoft` | `#FBF7EE` | Recessed / secondary surface, input fills |

**Ink and accents:**

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#203033` | Text, brand, primary button fill — a desaturated blue-green near-black, never pure black |
| `subtle` | `#5D6868` | Secondary body copy |
| `muted` | `#8A938F` | Metadata, placeholders, inactive tabs, chevrons |
| `sage` | `#607D6B` | The system accent: brand, positive, kicker text, progress fill, some primaries |
| `clay` | `#B9735E` | Warm accent |
| `blue` | `#5F7E9D` | Cool accent (reports, timeline) |
| `mist` | `#E8EFE9` | De facto "positive / selected" background |
| `border` | `#E4DED0` | **Declared but essentially unused** |
| `lavender` / `blush` | `#D8D7EA` / `#F0D8D1` | Decorative only — used once each, as confetti dots in the session completion screen |
| `warning` / `warningSoft` | `#A9473D` / `#F7E6DF` | The **entire** semantic layer |

**Token discipline is excellent.** In ~6,900 lines of screen code there are only **three** raw hex values (`#8580A9` in `SessionRecommendationCard.tsx:10`, `#334447` in `IntentProgressCard.tsx:95` and `weekly.tsx:197`) and **one** `rgba()` (the modal scrim in `library.tsx:530`). Color is the best-governed part of the system.

**Two structural gaps:**

1. **The semantic layer is one pair deep.** There is no `success`, `info`, or `error` distinct from decorative hues. `sage` simultaneously means brand, positive, accent, and (inconsistently) primary action. `mist` is doing semantic work — "selected," "positive," "highlight" — with no name that says so.
2. **Elevation is fill + shadow, not stroke.** The `border` token is declared and then almost never used; surfaces separate by ~1% luminance difference plus a soft shadow. This is what makes the app feel like layered paper, and it is a genuine identity asset — but it means surface hierarchy depends entirely on shadow rendering.

**Measured contrast (WCAG 2.1):**

| Pair | Ratio | AA normal (4.5) | AA large (3.0) |
| --- | --- | --- | --- |
| ink on card | 13.37 | PASS | PASS |
| ink on cream | 12.38 | PASS | PASS |
| subtle on card | 5.62 | PASS | PASS |
| subtle on cream | 5.20 | PASS | PASS |
| warning on warningSoft | 4.74 | PASS | PASS |
| **sage on card** | 4.41 | **FAIL** | PASS |
| **blue on card** | 4.13 | **FAIL** | PASS |
| **cream on sage** | 4.08 | **FAIL** | PASS |
| **sage on cream** | 4.08 | **FAIL** | PASS |
| **sage on mist** | 3.87 | **FAIL** | PASS |
| **cream on blue** | 3.82 | **FAIL** | PASS |
| **clay on card** | 3.61 | **FAIL** | PASS |
| **muted on card** | 3.08 | **FAIL** | PASS |
| **muted on cardSoft** | 2.95 | **FAIL** | **FAIL** |
| **muted on cream** | 2.85 | **FAIL** | **FAIL** |

`muted` is the systemic failure: it fails AA on every surface and fails even the large-text threshold on two of three — and it is the color used for all metadata, all placeholder text, all chevrons, and inactive tab bar labels.

---

## 3. Spacing system

Six steps, defined once in `theme.ts:19-26`:

```
xs 4 · sm 8 · md 14 · lg 20 · xl 28 · xxl 40
```

This is **not a strict 4pt or 8pt grid** — 14 and 20 break the 8pt rhythm, and the step ratios are irregular (2.0×, 1.75×, 1.43×, 1.4×, 1.43×). It reads as a hand-tuned scale rather than a derived one, which is defensible but makes it harder to hand to a second product.

**Adherence is the strongest measurable quality in the codebase.** Across 722 style keys there are only ~13 raw numeric padding/margin/gap values, and most are deliberate infrastructure:

- `paddingBottom: 120` ×4 — tab-bar clearance in scroll containers
- `paddingVertical: 2` ×4 — ultra-tight count pills
- `paddingTop: 72`, `paddingBottom: 80`, `marginTop: 7`, `marginTop: 22` — four genuine one-offs

Screen padding is uniform: `Screen` applies `spacing.lg` (20) on all sides, plus `paddingBottom: 120` in scroll mode.

**The one weakness:** vertical rhythm between cards is achieved by an ad-hoc `marginTop` on each individual card style rather than by a stack primitive. `app/(tabs)/index.tsx` alone declares nine separate `marginTop` values. Spacing *values* are tokenized; spacing *composition* is not.

---

## 4. Border & radius treatment

**Declared scale** (`theme.ts:28-34`): `sm 8 · md 12 · lg 18 · xl 28 · pill 999`.

**Actual practice: the scale is bypassed 53 times.** Raw `borderRadius: <number>` declarations, counted:

```
18 ×17   20 ×10   26 ×5   24 ×4   22 ×3   21 ×3
15 ×2    14 ×2    34 ×1   12 ×1   11 ×1    8 ×1
 7 ×1     5 ×1     4 ×1
```

The cause is identifiable and fixable: **there is no token for the rounded icon well.** Nearly every card leads with a 38–72px square containing a lucide glyph, and each screen picks its own radius (18, 20, 21, 24, 26, 34) to approximate an iOS continuous corner. Because `radii` offers no `container` step between 18 and 28, every author invents one.

**Borders are effectively absent.** The `border` token is unused in practice. Separation is achieved by fill contrast plus one of two shadow tokens:

| Token | Offset | Opacity | Radius | Elevation |
| --- | --- | --- | --- | --- |
| `soft` | y 10 | 0.08 | 24 | 3 |
| `quiet` | y 6 | 0.05 | 16 | 2 |

Both use `#203033` (ink) as shadow color rather than black — a small decision that is largely responsible for the app reading warm rather than grey.

**One deliberate, well-executed asymmetry:** the session chat bubbles use `borderBottomLeftRadius: radii.md` for Shepherd and `borderBottomRightRadius: radii.md` for the user (`session/index.tsx:382-407`), inheriting messaging-app convention correctly.

---

## 5. Card patterns

**The card is the layout system.** Every screen is a vertical stack of cards. Outside of page headers, there is essentially no non-card content region in the entire app.

**Recurring anatomy:** `radii.xl` + surface fill + `spacing.lg`/`xl` padding + internal `gap` + a shadow token.

**Four fills encode emphasis:**

| Fill | Meaning | Example |
| --- | --- | --- |
| `card` | Default / neutral | Wellness card, source tiles |
| `cardSoft` | Secondary / quiet | Insight panel, report card |
| `mist` | Positive / highlight | Review "suggested step," completion summary |
| `ink` or `sage` | Hero / inverted | Intent Engine, Connect the Dots, 3-Minute Reset |

**Dominant composition**, repeated more than any other pattern in the app: a 46–68px rounded icon well → a `flex: 1` copy column with **kicker → title → body** → a trailing `ChevronRight` in `muted`. That kicker/title/body triplet is re-declared in nearly every screen file.

**But there is no `Card` component.** A style key literally named `card` is defined **12 separate times**, alongside ~28 uniquely-named one-off card styles (`wellnessCard`, `shelfCard`, `ritualCard`, `dotsCard`, `intentCard`, `reportCard`, `trustCard`, `researcherCard`, `nativeShareCard`, `manualCard`, `reviewCardSoft`, `closingCard`, `doneCard`, …).

Of the 22 files in `src/components`, only **three** are generic — `Screen`, `EmptyState`, `LoadingScreen`. The other 19 are bound to specific content types (`ForgottenTreasureCard`, `IntentProgressCard`, `TimelineChapterCard`), so none of them can be reused for a new kind of content.

---

## 6. Button hierarchy

**No `Button` component exists.** There are ~40 button-related style keys spread across 20 files. `primaryButton` is independently redefined **5 times**; `backButton` **6 times**.

Measured variance in the *primary action alone*:

| Dimension | Values found |
| --- | --- |
| Fill | `ink` (10 sites), `sage` (3 sites) |
| Height | 46, 52, 54, 56, 58 |
| Radius | `radii.xl`, `radii.lg`, `radii.pill`, raw `18`, raw `20` |

A reader can still reconstruct a coherent five-level hierarchy from the code, which speaks to the strength of the underlying intent:

1. **Primary** — `ink` fill, `cream` label, `shadows.soft`
2. **Secondary** — `card` fill, `ink` label, `shadows.quiet`
3. **Tertiary / text** — pill on `mist`, `sage` label
4. **Inline card action** — pill on `cardSoft`, `ink` label, 38px tall
5. **Destructive** — `warningSoft` fill, `warning` label — **never a solid red**, which is a deliberate and well-judged extension of the product's non-alarming stance

**Three concrete inconsistencies:**

- **`sage` as primary.** "Create Shepherd" (`tasks/create.tsx:211`), the weekly primary (`weekly.tsx`), and "Analyze" (`screenshots.tsx`) use `sage` while every other primary uses `ink`. There is no product rationale for the split; it reads as drift.
- **Selection and action are visually identical.** A selected chip is `ink` fill + `cream` label (`tasks/create.tsx:197-207`) — exactly the primary button treatment. Users cannot distinguish "this is chosen" from "tap this to proceed."
- **Five heights and five radii** for what is semantically one control.

---

## 7. Icons

**One library, used consistently.** `lucide-react-native` across 32 files, **62 distinct glyphs**. `@expo/vector-icons` is a dependency but is never imported in app code. All icons are outline/stroke at default stroke width, with color passed explicitly at every call site (never inherited).

**Semantic mapping is strong and disciplined** — this is genuinely well done:

| Glyph | Meaning |
| --- | --- |
| `Sparkles` | AI / transformation |
| `HeartPulse` | Digital wellness |
| `Brain` | Memory / patterns |
| `BookOpen` | Library / ideas |
| `ShieldCheck` | Privacy / trust |
| `ChevronRight` | Navigate |
| `Archive` / `RotateCcw` | Keep safe / restore |

**But there is no size scale.** Sixteen distinct sizes are in use:

```
20 ×37   22 ×22   18 ×21   16 ×14   24 ×13   21 ×9
17  ×9   30  ×7   23  ×4   15  ×4   28  ×3   26 ×3
14  ×3   42  ×2   19  ×2   13  ×1
```

Values like 17, 19, 21, and 23 are eyeballed one-offs. A four-step scale (16 / 20 / 24 / 32) would cover every real use.

**Two smaller notes:** `Sparkles` is overloaded — it is the AI mark, the session mark, the Reset tab icon, and a decorative badge, appearing on nearly every screen. And brand glyphs (`Instagram`, `Chrome`, `Apple`) sit beside abstract lucide icons in the same capture-source grid, a mild identity mix.

---

## 8. Motion & animation

**Deliberately minimal.** Only **4 of 47 files** animate anything: `(tabs)/index.tsx`, `(tabs)/weekly.tsx`, `session/index.tsx`, `TransformationResultView.tsx`.

There are exactly three motion ideas in the product:

1. **Wellness bar fill** — 0 → 82 over 900ms, `useNativeDriver: false` (animating `width` percentage, so it runs on the JS thread).
2. **Step reveal** — opacity 0→1 and translateY 12→0 in parallel over 420ms, native driver. Used for session steps.
3. **Transformation reveal** — the same fade + lift.

**Characteristics:**

- **No easing is ever specified.** Every animation gets React Native's default `Easing.inOut(ease)`. There are no springs anywhere.
- **`react-native-reanimated` is installed but never imported in app code.** All motion uses the legacy `Animated` API.
- **Press feedback covers 15 of 68 Pressables (~22%)**, as `opacity: 0.9` + `scale: 0.99` — a near-invisible depress. The other ~53 interactive elements have **no visual press state at all**.
- **Haptics use raw `Vibration`**, not `expo-haptics` (not a dependency). `Vibration.vibrate(6)` for save/archive, `(8)` for capture/complete/transform, across 4 files. On iOS this produces a generic buzz rather than a proper `impactLight` / `notificationSuccess`; on Android it is a bare motor pulse. The *intent* — haptic confirmation on commit — is right; the implementation is the crudest available.
- **Screen transitions are stock** Expo Router / `react-native-screens` defaults. 13 routes are declared `presentation: "modal"`.
- **No skeletons.** Loading is either a full-screen `LoadingScreen` or an `EmptyState` carrying an in-voice message ("Shepherd is opening your private Library.").

---

## 9. Navigation patterns

**Two levels: a 5-item bottom tab bar plus a modal stack.**

Tabs (`app/(tabs)/_layout.tsx`): Home · Library · Shepherds · Memory · Reset.

- 84px tall, `paddingTop: 8`, label 11px/700
- `borderTopColor` is set **equal to** `backgroundColor` (both `cream`) — deliberately no separator line
- Active `ink`, inactive `muted` (the failing-contrast token)

**Modal-heavy by design.** 13 of ~20 non-tab routes are `presentation: "modal"`: capture (index + detail), session, dots, timeline, treasures, transformation, monthly report, task create/detail/results, asset detail, privacy. The app treats nearly everything beyond the tab surface as a temporary, dismissible task — which is coherent with a quick-triage product.

**No headers anywhere.** `headerShown: false` is set globally on both the stack and the tabs. The back affordance is a hand-rolled 46×46 `backButton` card containing `ArrowLeft`, redefined near-identically in **6 files**.

**Two routes are orphaned from the tab bar.** `screenshots` and `cleanup` are declared `href: null` and reachable only through home-screen tiles — a discoverability soft spot for what the product audit calls its most mature real feature.

**Home is a hub, not a dashboard.** `app/(tabs)/index.tsx` links out to roughly 18 destinations across ~12 sections. Library, Capture, Dots, and Timeline are each reachable from three or more entry points. Generous, but it makes the entry surface read as a portal rather than a triage queue.

---

## 10. Mobile interaction patterns

**Genuinely mobile-native in orientation:**

- Portrait-locked (`app.json`), `SafeAreaView` on every screen
- `showsVerticalScrollIndicator={false}` throughout — a deliberate calm choice
- 120px bottom scroll padding to clear the tab bar
- Horizontal `ScrollView` chip rails for filters (categories, collections, status)
- Primary CTAs sit last in the scroll or pinned to the bottom of fixed-height steps (session, welcome) — thumb-reachable

**But one-handed use is only partially engineered:**

- **`backButton` sits top-left** on 6 screens — the hardest corner to reach with a right thumb — with no swipe-back or bottom-sheet dismiss alternative.
- **No gestures at all.** `react-native-gesture-handler` is a dependency but is never imported in app code. There is no swipe-to-archive, no swipe-to-delete, no long-press, no drag.
- **No pull-to-refresh.** `library.tsx` calls `refresh()` on mount only.
- **`hitSlop` is used zero times.**

**Tap targets:** 14 interactive elements declare `minHeight` below the 44pt guideline — chips at 42, inline action buttons and text buttons at 38, the privacy status button at 36, count pills at 34. The highest-risk instance is `LibraryItemCard`'s three-across action row at 38px (`LibraryItemCard.tsx:165-173`), mirrored in `AssetCard`.

**Keyboard handling is absent.** No `KeyboardAvoidingView` anywhere, while 5 screens contain `TextInput` (sign-in, capture, tasks/create, library search, library edit modal). On `tasks/create` and the library edit modal, the save button will sit under the keyboard.

**Confirmation drops out of the design system.** All 15 confirmations and errors use native `Alert.alert`. This is the one surface where the product's carefully-built visual voice disappears entirely — though notably, the *copy* inside those alerts stays fully in character.

---

## 11. Information density

**Low per element, high per screen.** Every unit is a generously padded card (20–28px padding, 18–28px radius, gap-separated). But screens stack a great many of them:

- `app/(tabs)/index.tsx` — 572 lines, ~12 distinct sections, ~18 outbound destinations
- `app/(tabs)/library.tsx` — 597 lines: search box, hero card, intent progress, two promo cards, three horizontal chip rails, intent suggestion list, item list, and an edit modal

**`LibraryItemCard` is the density outlier.** A single card carries nine information layers: category · source · type · title · "AI Summary" label · summary · "Why you saved it" pill · "Suggested action" label · action text · three buttons. That is a *reading* card living inside a *triage* app.

**The core tension:** the visual system says "calm and spacious," while the information architecture says "here are eighteen things." Home currently reads as a launcher for every feature rather than a surface presenting one next action.

**There is no compact mode.** Everything is a full card. There are no list rows, no multi-select, no batch actions, no table view, and no density toggle anywhere in the product.

---

## 12. Tone of interface copy

**This is the most finished part of the product** and its strongest differentiated asset.

**Voice:** first-person Shepherd, second-person consent framing.

> "Your digital world has been busy."
> "I found a few saved things worth your attention today. Nothing changes unless you approve it."
> "Meet your digital caretaker."

**Custodial vocabulary, measured across the codebase:** gentle/gently (16), care/caretaker (10), worth (8), meaningful (6), breathe (4), matters (3), calm (3), deserve (2), peace (1).

**Verbs are systematically de-technicalized and de-escalated:**

| Conventional | Phone Shepherd |
| --- | --- |
| Delete | **Let go** |
| Archive | **Keep safe** |
| Done | **Care for this** |
| Start | **Begin gently** |
| Skip | **That is enough for today** |
| Delete task | **Retire this Shepherd?** |

**Errors and empty states stay in character, and always blame the system rather than the user:**

> "Shepherd could not save that yet" · "Shepherd needs another moment" · "Give Shepherd a little context" · "Nothing changed" · "This shelf is waiting for its first saved thing."

**Mechanics:** sentence case throughout; terminal periods on headlines (unusual, and consistently applied — "Your digital world has been busy."); no exclamation marks; no emoji; no ALL CAPS.

**A real terminology system exists:** Shepherd (the agent), Universal Capture, Universal Library, *saved thing*, Transformation, Intent Engine, Connect the Dots, Digital Life Timeline, Forgotten Treasures, Weekly Reset, Ask Your Memory, Digital Wellness.

**Two risks:**

1. **"Shepherd" is overloaded** — it is the app, the agent, a user-created task object, and a verb ("Share it to Shepherd" vs. "Create a Shepherd" vs. "Retire this Shepherd"). At scale this will need disambiguation.
2. **Hedging occasionally obscures the action.** "147 moments that may be easier to organize" and "ideas that may be worth growing" are so softened that the user cannot tell what tapping will do. Gentleness is the brand; ambiguity is a cost.

---

## 13. Accessibility considerations

**This is the weakest area, and it is quantifiable.**

**Zero occurrences**, across ~6,900 lines, of every one of the following: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityState`, `accessibilityValue`, `accessible`, `allowFontScaling`, `maxFontSizeMultiplier`, `hitSlop`.

Consequences:

- **68 Pressables expose no role.** VoiceOver and TalkBack announce them as plain text, not as buttons.
- **Icon-only controls are silent.** Six back buttons, the share button, edit buttons, and count pills contain no text and no label — screen readers announce nothing.
- **The wellness progress bar has no `accessibilityValue`.** The 82/100 score is available as text, but the bar itself conveys nothing.
- **Selection state is color-only.** Chips and tabs signal selection purely through fill; no `accessibilityState={{ selected: true }}`.
- **Contrast failures** as measured in §2 — with `muted` (all metadata, all placeholders, all inactive tab labels) failing AA on every surface and failing AA-large on two of three.
- **Dynamic Type will break layout.** Text scales; containers do not. Fixed `height: 56`, `minHeight: 38/42`, and 38–72px icon wells will clip or overlap at large accessibility text sizes, with no guard in place.
- **Light-only, no dark mode** — a comfort and accessibility gap that is particularly pointed for a product whose signature ritual is an evening reset.

**Genuine positives worth preserving:**

- Text is nearly always paired with an icon rather than icon-alone in primary navigation and cards.
- Body contrast is excellent where it matters most — ink on cream/card is 12.4–13.4:1.
- The language is plain, concrete, and jargon-free, which is a real cognitive-accessibility win that most products never achieve.
- No hover dependencies; no color-only error states (errors pair `warning` text with `warningSoft` fill and explicit copy).
- Native `Alert.alert` and native `Switch` are used, which inherit platform accessibility behavior for free.

---

## 14. Is there a real design system?

**Verdict: a strong token layer with almost no component layer.** Roughly 40% design system, 60% page-specific styling.

**Evidence for a system:**

- One centralized `src/lib/theme.ts` (colors, spacing, radii, typography, shadows), imported by essentially every screen.
- Near-total color token adherence — 3 raw hex values app-wide.
- Near-total spacing token adherence — ~13 raw values across 722 style keys.
- A genuinely recognizable visual language. Any single screen is identifiable as Phone Shepherd out of context.
- A consistent semantic icon mapping and a real terminology system.

**Evidence against:**

- **43 `StyleSheet.create` blocks / 722 style keys for ~47 files.** That ratio is page-specific styling, not composition.
- **No primitives exist**: no `Card`, `Button`, `Input`, `Chip`, `Pill`, `IconWell`, `SectionHeader`, or `Stack`. Only `Screen`, `EmptyState`, and `LoadingScreen` are generic; the other 19 components are content-bound and therefore non-reusable for new content types.
- **Duplication is measurable**: `card` ×12, `backButton` ×6, `primaryButton` ×5, and the kicker/title/body triplet in nearly every file.
- **Declared scales are bypassed**: 53 raw radii against a 5-token scale; 16 icon sizes; 5 primary-button heights; 2 primary-button fills.
- **Tokens are static constants, not a theme provider** — no runtime theming, no dark-mode path, no density mode.

**The distinction that matters:** the visual *language* is a system. The *code* is not. Phone Shepherd has the hard half — a coherent, opinionated, defensible aesthetic — and is missing the mechanical half that makes an aesthetic portable. This is precisely the constraint that governs the Conqify question.

---

## 15. Visual System & Conqify Family Fit

### Recommendation: **Option C — one shared design system with different product expressions**

With one important sequencing correction: **C is the right destination, and Phone Shepherd cannot currently adopt it.** The blocker is architectural rather than aesthetic. There is no component layer to point at a shared foundation, so "adopting Conqify's system" would today mean hand-editing 43 `StyleSheet` blocks — and PS would drift back out of alignment within a release or two.

### Why not A (keep both completely separate)

The palette, the custodial voice, and the terminology are the most valuable and most transferable assets this product has. Separation means permanently maintaining two accessibility baselines (and Phone Shepherd's is currently *zero*), two contrast decisions, two dark-mode efforts, two icon libraries, and two sets of copy rules. That cost compounds every release, and no user has ever experienced "these are two unrelated products" as a benefit.

### Why not B (make Phone Shepherd identical to Conqify)

The visual differences are doing real work. The 3-minute reset, one-tap triage chips, the 42px score numeral, the tight card stack, and the 84px tab bar are tuned for a phone held one-handed for ninety seconds. A spacious reading system would measurably slow the fastest thing about this product.

There is also an identity cost: the warm-paper palette, the ink-not-black shadow, and the "Let go / Keep safe" verb set **are** the brand. Dissolving them into a second product's expression sacrifices more identity than it recovers in coherence.

### Why C

Phone Shepherd and Conqify share a **worldview** — your saved digital life has meaning, and nothing happens without your approval — and differ in **tempo**. Shared foundation with different expression is the precise design pattern for that relationship.

Encouragingly, Phone Shepherd's low-level tokens are already close to what a calm, reflective product would want. The sage/cream/ink palette would be entirely at home in Conqify without modification. What genuinely differs — density, motion budget, typographic range — are all expression-layer concerns, which is exactly what a shared-token / separate-expression model is built to handle.

### What should eventually be shared

| Layer | Share? | Notes |
| --- | --- | --- |
| **Typography (typeface)** | Fully | One family, one weight set. Phone Shepherd uses no custom font today, so adoption is unusually cheap. Fix the 500/800-only weight vocabulary in the process — a shared ramp needs 400/500/600/700. |
| **Typography (scale)** | Shared ramp, different subsets | Same base size, same ratio, same step names. PS uses the tight end (14–32); Conqify uses the reading end plus a long-form prose style PS should never need. Neither product invents its own numbers. |
| **Base colors** | Fully | cream / card / cardSoft / ink and the sage / clay / blue / lavender / blush accents are family-defining. Identical hex values in both products. |
| **Semantic colors** | Fully | success / warning / error / info / selected / disabled, defined once. PS currently has one semantic pair and overloads `sage` and `mist` — that gap needs closing regardless of Conqify. |
| **Spacing tokens** | Same scale, different density defaults | One ramp. PS defaults to `md`/`lg` for card padding; Conqify defaults to `lg`/`xl`/`xxl`. Same tokens, different preset. |
| **Radii** | Fully — and add the missing token | One scale, plus an explicit `container` / icon-well radius. Its absence is the direct cause of PS's 53 raw radius values. |
| **Icons** | Fully | One library (lucide), one stroke width, one size scale (4 steps, not 16), one semantic mapping. `Sparkles` = AI, `Brain` = memory, `ShieldCheck` = privacy must mean the same thing in both apps. |
| **Buttons** | Shared hierarchy and semantics; per-product sizing | Same five roles (primary / secondary / tertiary / destructive / selected), same fills, same label treatment. PS uses the compact size, Conqify the comfortable one. Settle primary = `ink` permanently, and stop using the primary treatment for chip selection. |
| **Form controls** | Shared anatomy; per-product density | Same field / label / placeholder / focus / error / disabled treatment. PS: single-line, fast, autofocus. Conqify: multi-line, generous, autosave. |
| **Motion principles** | Principles shared, durations per-product | Same easing curves, same "reveal = fade + small lift," same reduced-motion policy. Durations differ: PS ~180–250ms, Conqify ~300–420ms. Haptic *semantics* belong in the shared layer even though only PS uses them heavily — and PS should move from raw `Vibration` to `expo-haptics` as part of that. |
| **Accessibility standards** | Fully — non-negotiable | One target: WCAG AA (4.5:1 body, 3:1 large), 44×44 minimum targets, complete screen-reader labelling, Dynamic Type to 200% without clipping, reduced-motion honored. **This is the single highest-value item on the list**, because PS's current score is literally zero and a shared standard is the mechanism by which it stops being zero. |
| **Terminology** | Shared for shared concepts | Capture, Library, *saved thing*, Transformation, Collection, Timeline, Reset must mean one thing across the family. Product-specific nouns (Shepherd, Intent Engine, Connect the Dots) stay local — provided they do not collide with a Conqify term for the same concept. |
| **Voice / tone** | Shared principles, different register | Shared: consent-first, never blames the user, non-destructive verbs, plain language, sentence case, no exclamation marks. Different register: PS is brief and reassuring in motion; Conqify is longer and reflective. Same personality, different speaking speed. |
| **Brand identity** | One family mark, two product marks | Shared wordmark relationship, shared palette, shared illustrative stance. Distinct product marks and app icons. |

### What should remain intentionally different

**Phone Shepherd**

- **Rapid intake** — capture must be ≤2 taps from both cold launch and the share sheet, with no confirmation *before* ingestion (only after). Conqify can afford a considered "add to…" flow; PS cannot.
- **Mobile-first** — portrait-locked, no tablet or desktop layout obligation, bottom-anchored actions, thumb-zone CTAs.
- **One-handed interactions** — today this is aspirational rather than real. Distinctness here means PS should diverge *further*: swipe-to-triage on library rows, bottom-sheet dismiss instead of the top-left back button, long-press for secondary actions. Conqify should not carry gesture triage at all.
- **Share-sheet flows** — an OS-embedded, minimal-chrome review surface that must render inside a share extension's constrained context. Conqify has no equivalent and should not inherit those constraints.
- **Capture confirmation** — fast, non-blocking, self-dismissing acknowledgment (toast + haptic), never a modal. A genuinely PS-only motion pattern.
- **Triage** — needs a **compact expression that does not exist today**: list rows, multi-select, batch actions, and keep/archive/delete affordances. This is the strongest argument for a *density mode* within a shared system rather than a separate system.
- **Minimal interruption** — shorter durations, fewer animated reveals, more haptic and less visual confirmation, and a substantially tighter home surface than today's 18-destination hub.

**Conqify**

- **Reading** — a measure-constrained long-form style (60–75 characters), larger body, looser leading. PS's ramp has no long-form style and should not gain one.
- **Reflection** — generous whitespace, fewer elements per screen, slower reveals, quiet empty states that invite rather than prompt.
- **Knowledge work** — richer IA: nested collections, cross-links, backlinks, annotations, multi-pane layouts. PS should stay deliberately flat.
- **Planning** — calendar, timeline, and board surfaces; drag-and-drop; multi-step editing. These require density and pointer affordances PS does not want.
- **Longer sessions** — persistent navigation, breadcrumbs, resumable state, and dark mode as a first-class comfort feature. PS's modal-heavy stack is correct for 90-second sessions and would be wrong for 40-minute ones.
- **Deeper information architecture** — more than two navigation levels; search as a surface rather than search as a tab.

### The prerequisite nobody should skip

The shared/different split above assumes Phone Shepherd *can express* a shared foundation. It currently cannot. The styling lives in 722 per-screen style keys rather than in components. The token layer is not the problem — it is already good. The missing layer is `Card`, `Button`, `Input`, `Chip`, `IconWell`, `SectionHeader`, and `Stack`.

### High-level sequencing only

Per the brief, this stops at sequencing and does not become a redesign roadmap. Nothing beyond step 0 should be scheduled until the product architecture audit is complete.

0. **Gate:** finish the product architecture audit.
1. **Fix accessibility in place** to a defined standard — roles, labels, 44pt targets, `muted` contrast, Dynamic Type containers. Zero visual redesign; worth doing whichever option is ultimately chosen; no Conqify dependency.
2. **Extract Phone Shepherd's component layer** against the *existing* PS tokens — `Button`, `Card`, `Input`, `Chip`, `IconWell`, `SectionHeader`, `Stack`. Pure consolidation, no visual change. This is the real prerequisite for any shared system.
3. **Then** agree the shared token contract with Conqify and repoint PS's tokens at it.
4. **Then** introduce the density / expression preset that lets PS stay tight while Conqify stays spacious.

Steps 1 and 2 carry standalone value and have no Conqify dependency, which is what makes them safe to sequence before the architecture audit concludes.

### Three inconsistencies recorded for later (not fixed in this audit)

1. **`sage` vs. `ink` as the primary button fill** — three sites diverge from ten with no product rationale.
2. **53 raw `borderRadius` values** against a 5-token scale — caused by the missing icon-well radius token.
3. **16 distinct icon sizes** where four would cover every real use.
