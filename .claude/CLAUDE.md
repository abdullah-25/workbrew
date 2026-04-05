# Design System

## Layout

Three-column full-viewport layout. No scrolling except designated scroll regions.

```
| Nav (64px) | Panel (320px) | Main content (remaining width) |
```

All columns are full viewport height. Only the panel list region scrolls.

---

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#faf9f6` | App background, nav, panel |
| `--bg-surface` | `#ffffff` | Card surfaces |
| `--border` | `#e8e4dd` | All dividers, card borders |
| `--text-primary` | `#1a1a1a` | Headings, primary labels |
| `--text-secondary` | `#6b6860` | Muted labels, tags, hints |
| `--accent` | `#1a1a1a` | Active states, filled buttons |

Semantic colors for status/data:

| Meaning | Background | Text |
|---------|------------|------|
| Positive / Good | `#dcfce7` | `#166534` |
| Warning / Mid | `#fef9c3` | `#854d0e` |
| Negative / Bad | `#fee2e2` | `#991b1b` |
| Informational | `#dbeafe` | `#1e40af` |
| Neutral | `#f3f4f6` | `#6b7280` |

No gradients. No drop shadows. No decorative chrome.

---

## Typography

- Font family: `DM Sans, -apple-system, sans-serif` (load from Google Fonts)
- Two weights only: **400** regular, **500** medium — never 600 or 700
- Base size: 15px / line-height 1.6
- Secondary/muted text: 13px
- Labels and pills: 12px
- Headings: 15px weight 500 — no large display type

---

## Spacing

- Column internal padding: `16px`
- Gap between cards/items: `12px`
- Component internal padding: `12px 16px`
- Use multiples of 4px for all spacing

---

## Borders & Radius

- All borders: `0.5px solid #e8e4dd`
- Cards: `border-radius: 12px`
- Pills / chips: `border-radius: 999px`
- Buttons: `border-radius: 8px`
- No border-radius above 12px except pills

---

## Components

### Nav (Column 1)
- Icon-only, no text labels
- 44px hit targets, icons centered
- Active state: filled dark pill (`background: #1a1a1a`) behind icon, icon turns white
- Inactive: icon color `#6b6860`
- Border-right: `0.5px solid #e8e4dd`

### Panel (Column 2)
- Background `#faf9f6`
- Border-right: `0.5px solid #e8e4dd`
- List region scrolls independently

### Cards
- Background `#ffffff`
- Border: `0.5px solid #e8e4dd`
- Border-radius: `12px`
- No shadow
- Images: `object-fit: cover`, no border-radius on image itself

### Pills / Badges
- Border-radius: `999px`
- Padding: `3px 10px`
- Font-size: `12px`
- Use semantic color pairs from the color table above
- No border on tinted pills

### Chips (filter row)
- Single-select horizontal scrollable row
- Active: `background: #1a1a1a`, white text, `border-radius: 999px`
- Inactive: transparent bg, `0.5px solid #e8e4dd` border
- Font-size: `13px`, padding: `5px 14px`
- Hide scrollbar, `gap: 8px`

### Buttons
- Default: transparent bg, `0.5px solid #e8e4dd`, `border-radius: 8px`, `padding: 8px 14px`, `font-size: 13px`
- Hover: `background: #f0ede8`
- Primary/filled: `background: #1a1a1a`, white text, same radius and padding

### Slider
- Track: 2px, color `#e8e4dd`
- Thumb: 14px circle, `#1a1a1a`
- Value label updates live

### Status Pill
- `background: rgba(0,0,0,0.55)`, white text
- `border-radius: 999px`, `padding: 5px 12px`, `font-size: 12px`
- Used for pinned contextual info (e.g. timestamps, counts)

---

## Interactions

- Transitions: `150ms ease` on hover and active states
- Hover on interactive elements: subtle background shift to `#f0ede8`
- Active/selected cards: thin highlight ring (`outline: 1.5px solid #1a1a1a`)
- No modals, no tooltips, no popovers — all content inline

---

## What to avoid

- No Inter, Roboto, or Arial
- No purple gradients or colored backgrounds
- No `box-shadow` on cards or panels
- No font weights above 500
- No border-radius above 12px except pills
- No dark sidebar or nav
- No decorative dividers or ornamental elements
- No loading states for static/mock content

## project structure

your-project/
├─ frontend/                  # React app
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  └─ utils/
│  └─ Dockerfile              # node:alpine, runs `npm start`
│
├─ backend/                   # FastAPI (Python)
│  ├─ routers/
│  ├─ models/
│  ├─ schemas/
│  ├─ services/
│  ├─ core/
│  │  ├─ config.py
│  │  └─ database.py
│  ├─ main.py
│  ├─ requirements.txt
│  └─ Dockerfile              # python:slim, runs uvicorn
│
├─ docker-compose.yml
├─ .env
├─ README.md
└─ .gitignore