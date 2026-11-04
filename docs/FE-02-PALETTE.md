# FE-02: Convivialita palette

## Scope
The palette is opt-in via the palette class in FRONTEND/client/src/styles/common/palette.module.css. Home composes it through CSS Modules. Existing root variables, navigation styles, fonts, dependencies, copy, routes and API behavior are unchanged. Other screens do not opt in yet. This is a color foundation, not the full home redesign or completion of FE-01.

## Tokens
- Background: #FAF7F2 (ivory).
- Surface / on-primary / on-accent: #FFFFFF.
- Primary action: #B54735 (terracotta); hover: #933829.
- Accent: #245C4A (deep green).
- Text: #242824; secondary text: #5C625C.
- Decorative border: #DDD5CA. Not intended as the sole boundary for interactive form controls.
- Focus: deep green on light surfaces, white around the final CTA button on green.

## Initial application
Home hero uses ivory with dark text. Its primary action is terracotta with white text; its secondary action is green outlined on white. Feature icons are green. The final CTA section is green with white copy and a white button. Blue/purple gradients and title text shadow are removed. Existing sections, spacing, typography and hover/entrance animations are retained. Grid minimum is bounded by available width. Reduced-motion rules are scoped to the home subtree; the previous module-level html scroll rule is removed.

## Verification pending
- Frontend production build, including CSS Modules composition.
- Visual review at 320, 375, 768 and 1440 CSS pixels for both authenticated and guest variants.
- Contrast measurements for actual rendered text, hover and focus combinations. No accessibility certification is claimed.
- Keyboard focus, reduced motion, long translations and native safe-area checks.
- Screenshots before/after and review of unchanged navbar/footer alongside the new home colors.

No merge or production deployment is part of this commit.
