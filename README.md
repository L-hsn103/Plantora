# Plantora

A modern website for **Plantora** — a plant recommendation service that helps users discover indoor plants matching their space, environment, and lifestyle.

## Overview

Plantora is built with vanilla HTML, CSS, and JavaScript. It features a nature-inspired marketing landing page, plus a searchable plant catalog with a detail page for each plant — all data-driven from a JSON file.

## Pages

- **`index.html`** — Landing page: hero, features grid, how-it-works steps, final CTA
- **`explore.html`** — Plant catalog with live search + filters (light, water, maintenance, size, suitability)
- **`plant-details.html`** — Individual plant info: requirements, care guide, indoor suitability (loaded via `?id=`)

## Features

- **Hero Section** — Compelling headline, description, and dual CTAs with decorative organic visual
- **Features Grid** — 4 benefit cards with hover effects
- **How It Works** — 3-step process illustration
- **Explore Plants** — Searchable, filterable plant catalog rendered from `Data/plants.json`
- **Plant Details** — Per-plant requirements & care guide on a separate page
- **Sticky Navbar** — Logo, navigation links, and primary CTA (active page highlighted)
- **Footer** — Brand info and navigation links
- **URL loading** — `script.js` tries `Data/plants.json` first, falling back to built-in sample data

## Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties (variables), Flexbox, Grid, media queries
- **Vanilla JavaScript** — Data loading, search, filtering, and dynamic rendering
- **JSON** — Plant data in `Data/plants.json`
- **Google Fonts** — Fraunces (headings) + Inter (body)

## Project Structure

```
Plantora/
├── index.html         # Landing page
├── explore.html       # Plant catalog (search + filters)
├── plant-details.html # Individual plant detail page
├── Data/plants.json  # Plant data (single source of truth)
├── style.css          # Shared theme styles
├── explore.css        # Catalog + detail page styles
├── script.js          # Shared logic (data, catalog, details)
└── README.md          # This file
```

## Getting Started

No build step or dependencies required.

```bash
# Option 1: Open index.html directly in a browser
open index.html

# Option 2: Serve locally (recommended so Data/plants.json loads over the network)
python -m http.server 8000
# Then visit http://localhost:8000
```

> **Note:** `script.js` fetches `Data/plants.json`. When you open files directly via `file://`, some browsers block that request — in that case the built-in sample data in `script.js` is used instead.

## Plant Data (Data/plants.json)

All plant info lives in `Data/plants.json`. Add or edit entries there — both the catalog and detail pages will pick them up automatically. Each entry follows this schema:

```json
{
  "id": 1,
  "name": "Snake Plant",
  "scientificName": "Dracaena trifasciata",
  "image": "image/snake-plant.jpg",
  "light": "Very Low",
  "water": "Very Low",
  "humidity": "Low",
  "temperature": "Warm",
  "space": "Medium",
  "maintenance": "Very Low",
  "difficulty": "Very Easy",
  "size": "Medium",
  "indoorSuitability": "Highly Suitable",
  "description": "A short, friendly overview of the plant.",
  "careGuide": {
    "watering": "How often and how much to water.",
    "fertilizer": "When and how to feed.",
    "repotting": "When to repot.",
    "cleaning": "How to keep it clean and dust-free."
  }
}
```

### Allowed values

Keep the wording consistent, because the catalog filters match these fields by exact value:

| Field | Values |
| --- | --- |
| `light` | Very Low, Low, Medium, High, Very High |
| `water` | Very Low, Low, Medium, High, Very High |
| `humidity` | Very Low, Low, Medium, High, Very High |
| `temperature` | Mild, Moderate, Warm |
| `space` | Very Small, Small, Medium, Large, Very Large |
| `maintenance` | Very Low, Low, Medium, High |
| `difficulty` | Very Easy, Easy, Moderate, Hard |
| `size` | Tiny, Small, Medium, Large |
| `indoorSuitability` | Highly Suitable, Suitable, Moderately Suitable |

The Explore page builds its filter dropdowns from whatever values are actually
present in the data, so a new value shows up automatically. Only the *order* of
the scale lives in `script.js` (`FILTER_FIELDS`).

The `image` field currently uses free placeholder images — swap them for real local images later.

> **Note:** `script.js` also contains a copy of this data as a fallback for
> `file://` usage. Keep the two in sync when the JSON changes.

## Responsive Breakpoints

- **Desktop** — ≥ 900px (4-column features, 3-column card grid, side-by-side hero)
- **Tablet** — ≤ 900px (2-column features/cards, wrapped filters)
- **Mobile** — ≤ 640px (single column, simplified navbar, stacked hero)

## Design System

Colors, typography, spacing, and shadows are defined as CSS custom properties in `style.css` `:root` for easy theming:

```css
:root {
  --color-bg: #f6f8f1;
  --color-primary: #2d5a3d;
  --color-accent: #6fa25a;
  --color-gold: #e3b23c;
  --font-heading: "Fraunces", serif;
  --font-body: "Inter", sans-serif;
  --radius-md: 16px;
  --shadow-soft: 0 20px 40px -20px rgba(23, 48, 31, 0.28);
}
```

## Accessibility

- Semantic HTML5 elements
- Visible focus states for keyboard navigation
- `prefers-reduced-motion` support
- Sufficient color contrast ratios
- Alt text on card images

## License

Student project — all rights reserved.