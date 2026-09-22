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
  "image": "https://placehold.co/400x300/6FA25A/ffffff?text=Snake+Plant",
  "light": "Low",
  "water": "Low",
  "humidity": "Low to Average",
  "temperature": "18–30°C",
  "space": "Small to Medium",
  "maintenance": "Low",
  "difficulty": "Easy",
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

The `image` field currently uses free placeholder images — swap them for real local images later.

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