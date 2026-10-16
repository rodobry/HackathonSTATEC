# Accessibility

The internal RGAA 4.1.2 self-assessment of 15 October 2026 found **64 criteria met, 3 not met and
39 not applicable**. On 16 October the team fixed the three failing criteria (3.3 control outline
contrast, 10.4 chart text when only the text size grows, 10.13 tooltips) and now counts **67 met,
0 not met, 39 not applicable**. This is a self-assessment, not an independently verified compliance
claim, and the new count does not replace a full reassessment. The accessibility statement is the
site’s “Accessibility” page (`#/accessibility`), in French, English and German.

## Method

- 12 pages, 14 views: Home, Products, Wine (map, balance, table), Countries, France, Compare,
  What’s changing, Quiz, Understand, About, Search, API.
- Automated check with axe-core 4.10.2 (WCAG 2.0, 2.1 and 2.2, levels A and AA).
- Contrast computed for every text and chart colour, in light and dark themes.
- Manual checks: keyboard only, headings, lists, languages, 320 px width, 200% text, increased text
  spacing, reduced motion.

## Automated check of 16 October 2026

axe-core 4.10.2 (WCAG 2.0, 2.1 and 2.2, levels A and AA) found no violations on 8 views in the
light theme, 2 of them also in the dark theme:

- Home with a chosen period (2005 to 2015), light and dark
- Products for 2010
- Countries for 2015
- Germany, Seasonality tab
- Wine, Seasonality tab, light and dark
- Wine, Trend tab with a chosen period
- Compare, Trend tab with a chosen period
- Understand

## What the site provides

- Charts have titles and CSV exports. Product, country and comparison figures also offer
  explanations and table views; the home charts do not all have those alternatives.
- The seasonality heatmap is an HTML table with year and month headers. Each cell carries its
  amount and its gap to the year’s average as text for screen readers, so colour is never the only
  carrier of the value.
- Year and period selectors are labelled native lists; after a change, focus stays on the list
  that was used.
- Charts (arrow keys), tabs, selectors, search and quiz all work with the keyboard.
- The site announces loading, errors and confirmations to screen readers.
- The page language follows the chosen language, and so does the skip link.
- No horizontal scrolling at 320 px, and animations stop with “reduce motion”.

## Known limits

- No screen reader test yet; maps, chart tooltips and the seasonality heatmap especially need this
  validation.
- Key events, contribution bars, the year and period choice and the Seasonality tab have had the
  automated check only, not a manual criterion-by-criterion check.
- A full RGAA reassessment is needed before publishing a compliance percentage for the current version.
- On a narrow phone with text at 200%, long chart labels are shortened; the full text stays in the
  tooltip and the chart notes.
