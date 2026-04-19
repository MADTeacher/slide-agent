---
name: slidev-png-review-gate
description: Visually validate freshly exported Slidev PNG slides through a strict slide-by-slide review gate. Use when a reviewer must treat PNG output as the source of truth for layout and design QA, record only concrete visible defects, and re-check the latest render after each fix cycle.
---

# Slidev PNG Review Gate

Use this skill from `slidev-reviewer` after static checks pass and a fresh `bun run export:png` run has completed successfully.

## Non-Negotiables

- Review only freshly exported PNG slides from the current `slides.md`. Never rely on memory, earlier screenshots, or stale files in `output/`.
- Treat rendered PNG output as the source of truth for layout and design QA. `slides.md` alone is not enough for visual validation.
- Start at `1.png` and move forward sequentially. Do not advance to the next slide while the current slide still has visible defects.
- After any rework cycle, require a new `bun run export:png` run and inspect only the new PNG files.
- Record only concrete visible defects. Do not report vague “could look better” feedback without an observable issue.
- Do not fix files yourself. `slidev-reviewer` diagnoses only and sends issues back to `slidev-stylist`.

## Review Loop

1. Confirm static review passed. If structural, syntax, or deck-spec errors remain, stop and return a failed review without PNG inspection.
2. Run `bun run export:png`.
3. Confirm the newest PNG directory exists in `output/` and contains numbered slides.
4. Review slides in order, beginning with `1.png`.
5. For each slide, note every concrete visible defect before moving on.
6. If any issue is found on a slide, return it with a specific suggested fix. The next review cycle must begin again from `1.png` using a fresh export.
7. Mark visual review as passed only when all slides in the latest PNG directory are clean.

## Visual Checklist

Fail or warn on visible defects such as:

- titles, subtitles, footers, or content cards clipped at the top, bottom, or sides
- overflow in cards, chips, grids, dialogs, tables, or multi-column layouts
- raw HTML, Vue, Markdown, or Mermaid appearing as literal text in the rendered slide
- overly tight vertical rhythm that makes the slide feel cramped or unstable
- broken hierarchy where a headline or decorative block visually overpowers the real content
- mismatch between text content and the illustration or labeled visual on the same slide
- answers shown too early in an exercise or practice slide
- visually fragile complex blocks that should be simplified into a safer layout

## Issue Categories

Use one of these categories exactly:

- `clipping`
- `overflow`
- `rendering`
- `hierarchy`
- `spacing`
- `content-visibility`
- `fidelity`

## Output Contract

Return this shape for the visual gate:

```json
{
  "passed": false,
  "summary": "Visual review found 2 issues in freshly exported PNG slides.",
  "pngDirectory": "./output/presentation-name/",
  "reviewedSlides": 10,
  "issues": [
    {
      "slide": 6,
      "severity": "warning",
      "category": "clipping",
      "message": "Title is clipped at the top edge.",
      "suggestedFix": "Reduce heading size or move the slide to a header layout."
    }
  ]
}
```

## Severity Guidance

- `error`: the slide is visibly broken or misleading and must be fixed before approval
- `warning`: the slide is usable but has a real visual or instructional defect
- `info`: minor note that does not block approval

Visual review passes only when there are no `error` issues.
