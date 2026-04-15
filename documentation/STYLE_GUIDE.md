# Application Style Guide

This document is a complete design specification for building new applications that match the look and feel of the WAKE App. Any new app built from this guide will share the same visual language, interaction patterns, and component behaviour.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Sizing](#spacing--sizing)
5. [Borders, Radius & Shadows](#borders-radius--shadows)
6. [Transitions & Animations](#transitions--animations)
7. [Layout & Shell](#layout--shell)
8. [Header / Title Bar](#header--title-bar)
9. [Left Panel (Expandable Menu)](#left-panel-expandable-menu)
10. [User Menu (Top-Right)](#user-menu-top-right)
11. [Theme Toggle (Light / Dark)](#theme-toggle-light--dark)
12. [System Metrics Button & Dropdown](#system-metrics-button--dropdown)
13. [Settings Modal](#settings-modal)
14. [Buttons](#buttons)
15. [Form Inputs & Selects](#form-inputs--selects)
16. [Cards & Containers](#cards--containers)
17. [Modals & Dialogs](#modals--dialogs)
18. [Toast Notifications](#toast-notifications)
19. [Status Badges](#status-badges)
20. [Tooltips](#tooltips)
21. [Scrollbars](#scrollbars)
22. [Skeleton Loaders](#skeleton-loaders)
23. [Icons](#icons)
24. [Responsive Breakpoints](#responsive-breakpoints)
25. [Accessibility](#accessibility)
26. [CSS Variable Reference](#css-variable-reference)
27. [ThemeContext Implementation](#themecontext-implementation)
28. [File & Folder Conventions](#file--folder-conventions)

---

## Design Principles

- **Flat surface with depth through shadow** — backgrounds are plain; elevation is communicated with box-shadow levels, not gradients.
- **One accent color, many derivatives** — the entire palette is driven by a single configurable accent hex; hover and light variants are computed automatically from HSL.
- **Subtle motion** — transitions are 0.15–0.3 s, eased; no gratuitous animation.
- **Legible at a glance** — font weights 600–700 for labels, 400–500 for body; uppercase + letter-spacing only on micro-labels.
- **Dark and light parity** — every component must look equally polished in both themes.

---

## Color System

### Accent Color (User-Configurable)

The entire app accent is a single hex color stored in `localStorage` under `accentColor`. It is applied to the CSS custom property `--accent-color`, and two derivative shades are generated from it at runtime. The default is **orange**.

| Variable | Default (Orange) | Purpose |
|---|---|---|
| `--accent-color` | `#FF6B35` | Primary interactive color |
| `--accent-color-hover` | `#FF7F50` | Hover state |
| `--accent-color-light` | `#FFA07A` | Subtle tint backgrounds |

Variants are computed in HSL:
- **Hover:** saturation +10 (max 100), lightness +10 (max 85)
- **Light:** saturation −20 (min 30), lightness +25 (max 90)

#### Preset Accent Colors

These swatches are presented in the Settings → Appearance tab.

| Name | Hex |
|---|---|
| Orange (default) | `#FF6B35` |
| Blue | `#2196F3` |
| Green | `#4CAF50` |
| Purple | `#9C27B0` |
| Red | `#F44336` |
| Teal | `#009688` |
| Pink | `#E91E63` |
| Amber | `#FFC107` |
| Indigo | `#3F51B5` |
| Cyan | `#00BCD4` |

### Semantic Colors (fixed)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--danger-color` | `#dc3545` | `#ff6b6b` | Destructive actions, errors |
| `--accent-warning` | `#f0ad4e` | `#f39c12` | Warnings |
| `--accent-warning-hover` | `#ec971f` | `#e67e22` | Warning hover |
| Success (no variable) | `#4CAF50` / `#28a745` | same | Success states |
| Info (no variable) | `#2196F3` | same | Informational states |

### Background Palette

| Variable | Light | Dark | Use |
|---|---|---|---|
| `--bg-primary` / `--background-main` | `#F5F5F5` | `#1A1A1A` | Page background |
| `--bg-secondary` | `#EFEFEF` | `#252525` | Panels, sidebars |
| `--bg-tertiary` / `--background-card` | `#FFFFFF` | `#2A2A2A` | Cards, modals, raised surfaces |
| `--background-input` | `#FFFFFF` | `#333333` | Text inputs, hover fills |

### Text Palette

| Variable | Light | Dark |
|---|---|---|
| `--text-primary` | `#1A1A1A` | `#FFFFFF` |
| `--text-secondary` | `#666666` | `#CCCCCC` |
| `--text-placeholder` | `#999999` | `#888888` |

### Border Palette

| Variable | Light | Dark |
|---|---|---|
| `--border-color` | `#E0E0E0` | `#404040` |
| `--border-hover` | `#CCCCCC` | `#555555` |

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
             'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
             sans-serif;
```

Monospace (code, keyboard shortcuts):
```css
font-family: 'Courier New', monospace;
```

### Scale

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero number (metrics) | `36px` | 800 | Uptime display |
| Large metric value | `1.75rem` (28px) | 700 | Dashboard numbers |
| App name / logo | `1.5rem` (24px) | 800 | Header wordmark |
| Modal heading | `24px` | 600–700 | `<h2>` inside modal |
| Section heading | `18px` | 600 | Settings `<h3>` |
| Body / standard | `1rem` (16px) | 400 | Default text |
| Body large | `1.1rem` (17.6px) | 400 | Text areas, descriptions |
| Label / meta | `14px` | 500–600 | Form labels, nav subtitles |
| Small label | `13px` / `12px` | 500–600 | Sub-labels, badge text |
| Micro label | `11px` / `10px` | 600 | Uppercase metric titles |
| Shortcut code | `0.75rem` (12px) | 400 | `font-family: monospace` |

### Letter Spacing

| Context | Value |
|---|---|
| App wordmark | `−0.01em` |
| Tagline / sub-word | `+0.02em` |
| Uppercase micro-labels | `0.5px – 1px` |
| Keyboard shortcuts | `0.5px` |

### Line Height

| Context | Value |
|---|---|
| Default body | `1.6` |
| Cards, modals | `1.5` |
| Compact labels | `1.2 – 1.4` |

---

## Spacing & Sizing

Use a base-8 grid. Common increments: `4px 8px 12px 16px 20px 24px 32px 40px 48px`.

### Gap / Margin Tokens (informal)

| Name | Value |
|---|---|
| xs | `0.25rem` (4px) |
| sm | `0.5rem` (8px) |
| md | `0.75rem` (12px) |
| lg | `1rem` (16px) |
| xl | `1.5rem` (24px) |
| 2xl | `2rem` (32px) |

### Icon Sizes

`16 18 20 22 24 28 32 36 40 48 px`

Standard inline icon: **20–24 px**. Header icon buttons: **22 px icon, 40–44 px touch target**.

### Interactive Targets

| Element | Width × Height |
|---|---|
| Circular icon buttons (theme, user) | `40px × 40px` |
| Metrics button | `44px × 44px` |
| Avatar inside user button | `32px × 32px` |
| Swap / rotate button | `48px × 48px` |

---

## Borders, Radius & Shadows

### Border Radius Scale

| Name | Value | Use |
|---|---|---|
| xs | `4px` | Chips, small badges, modal close button |
| sm | `6px` | Action buttons, small interactive elements |
| md | `8px` | Buttons, inputs, nav items, metric boxes |
| lg | `10px–12px` | Modals, dropdowns, settings panel |
| xl | `16px` | Major containers, cards |
| pill | `20px` | Status badges |
| circle | `50%` | Avatars, circular buttons |

### Shadows

| Variable | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 2px 4px rgba(0,0,0,0.05)` | `0 2px 4px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | `0 4px 12px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.15)` | `0 8px 24px rgba(0,0,0,0.5)` |

Apply `--shadow-sm` to headers and panels, `--shadow-md` to cards and dropdowns, `--shadow-lg` to modals and overlaid surfaces.

---

## Transitions & Animations

### Duration Guidelines

| Duration | Use |
|---|---|
| `0.15s` | Micro-interactions (menu open, hover bg swap) |
| `0.2s` | Most hover / focus state changes |
| `0.3s` | Modal open/close, panel slide, theme switch |
| `0.35–0.4s` | Panel width resize |
| `1.5–2s` | Infinite pulsing / loading animations |

### Easing

- Default interactions: `ease`
- Open/close: `ease-out`
- Complex physics: `cubic-bezier(0.4, 0, 0.2, 1)` (Material-style)

### Named Keyframes

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideInDown {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

@keyframes dashPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

@keyframes skeleton-loading {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes userMenuFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes metrics-slide-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## Layout & Shell

The app shell has three fixed regions:

```
┌──────────────────────────────────────────────────────┐
│  HEADER (fixed top, full width, z-index 200)         │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  LEFT      │  MAIN CONTENT                           │
│  PANEL     │  (fills remaining space, scrollable)    │
│  (fixed,   │                                         │
│  slide-in) │                                         │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

- **Header:** `position: fixed; top: 0; left: 0; right: 0; height: ~73px; z-index: 200`
- **Left panel:** `position: fixed; top: 73px; left: 0; bottom: 0; z-index: 100`
- **Main content:** `margin-top: 73px; margin-left: [panel-width when open]`; transitions in sync with panel.

```css
body {
  margin: 0;
  font-family: /* system stack */;
  background-color: var(--background-main);
  color: var(--text-primary);
  line-height: 1.6;
}

*, *::before, *::after {
  box-sizing: border-box;
}
```

---

## Header / Title Bar

The header contains (left → right):

1. **Left-panel hamburger toggle** (absolute left edge)
2. **Logo** (centered, or left-of-center)
3. **Header actions group** (absolute right edge): System Metrics button · Theme toggle · User menu button

### Structure

```html
<header class="header">
  <button class="panel-toggle-header" aria-label="Toggle menu">
    <!-- hamburger SVG -->
  </button>

  <div class="header-center">
    <div class="logo">
      <svg class="logo-icon-svg" width="32" height="32"> ... </svg>
      <span class="logo-text">
        <span class="logo-text-doc">My</span><span class="logo-text-app">App</span>
      </span>
    </div>
    <span class="app-subtitle">Short tagline or version</span>
  </div>

  <div class="header-actions">
    <!-- MetricsDropdown button -->
    <!-- ThemeToggle button -->
    <!-- UserMenu button -->
  </div>
</header>
```

### CSS

```css
.header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;       /* center the logo */
  padding: 1rem 2rem;
  background: var(--background-card);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

/* Logo ----------------------------------------------------------------- */
.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  text-decoration: none;
  color: inherit;
}

.logo-icon-svg {
  width: 32px;
  height: 32px;
  display: block;
}

.logo-text-doc {
  color: var(--accent-color-light);
  font-weight: 400;
  letter-spacing: 0.02em;
}

.logo-text-app {
  background: linear-gradient(135deg, var(--accent-color), var(--accent-color-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
  letter-spacing: -0.01em;
}

/* Hamburger toggle ----------------------------------------------------- */
.panel-toggle-header {
  position: absolute;
  left: 1rem;
  background: none;
  border: none;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.panel-toggle-header:hover {
  background-color: var(--background-input);
  color: var(--accent-color);
}
.panel-toggle-header:active { transform: scale(0.95); }

/* Hamburger icon lines */
.hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: center;
}
.hamburger-icon { display: flex; flex-direction: column; gap: 4px; }
.hamburger-icon.open .hamburger-line.top    { transform: translateY(6px) rotate(45deg); }
.hamburger-icon.open .hamburger-line.middle { opacity: 0; }
.hamburger-icon.open .hamburger-line.bottom { transform: translateY(-6px) rotate(-45deg); }

/* Header actions ------------------------------------------------------- */
.header-actions {
  position: absolute;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

---

## Left Panel (Expandable Menu)

The left panel slides in from the left. Its width is user-resizable (drag handle on the right edge).

### Behaviour

- Closed: `transform: translateX(-100%)` (hidden off-screen)
- Open: `transform: translateX(0)`
- Width: resizable between **200 px** and **500 px** (default ~280 px stored in localStorage)
- Main content receives `margin-left: [panelWidth]px` when open (transitions in sync)

### Structure

```html
<aside class="left-panel" style="width: 280px;">
  <div class="left-panel-content">

    <!-- Section label -->
    <div class="panel-section-label">Navigation</div>

    <nav class="panel-nav">
      <button class="panel-nav-item panel-nav-item--active">
        <span class="nav-item-icon"><!-- SVG --></span>
        <span class="nav-item-content">
          <span class="nav-item-title">Dashboard</span>
          <span class="nav-item-subtitle">Overview & metrics</span>
        </span>
      </button>
      <!-- more nav items -->
    </nav>

    <!-- Optional: collapsible metrics section (see System Metrics) -->

  </div>

  <!-- Drag handle -->
  <div class="panel-resize-handle" role="separator" aria-orientation="vertical">
    <div class="panel-resize-handle-line"></div>
  </div>
</aside>
```

### CSS

```css
.left-panel {
  position: fixed;
  top: 73px; left: 0; bottom: 0;
  background: var(--background-card);
  border-right: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, width 0.3s ease;
  overflow: hidden;
}
.left-panel.closed { transform: translateX(-100%); }
.left-panel.open   { transform: translateX(0); }

.left-panel-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  padding: 0 0.25rem;
  margin-bottom: 0.25rem;
}

/* Nav items ------------------------------------------------------------ */
.panel-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.panel-nav-item {
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}
.panel-nav-item:hover {
  border-color: var(--accent-color);
  background: var(--background-input);
}
.panel-nav-item--active {
  border-color: var(--accent-color);
  background: var(--background-input);
  box-shadow: 0 0 0 1px var(--accent-color);
}

.nav-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}
.nav-item-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Resize handle -------------------------------------------------------- */
.panel-resize-handle {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 12px;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s ease;
  z-index: 102;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-resize-handle:hover,
.panel-resize-handle.resizing {
  background-color: var(--bg-secondary);
}
.panel-resize-handle-line {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  background: var(--border-color);
  transition: all 0.2s ease;
}
.panel-resize-handle:hover .panel-resize-handle-line,
.panel-resize-handle.resizing .panel-resize-handle-line {
  height: 60px;
  background: var(--accent-color);
}
```

---

## User Menu (Top-Right)

Clicking the user avatar button opens a dropdown anchored to its bottom-right. The dropdown shows user info, a Settings item, and a Logout item.

### Authentication Modes

- **SINGLE_USER_MODE** (local / dev): No login required. A synthetic "Admin" user is injected. The user button is always shown.
- **Keycloak SSO** (production): Full OAuth2 flow. User info (name, email) is pulled from the Keycloak token. A "Role" badge is shown when the user is an admin.

### Structure

```html
<div class="user-menu-wrapper">
  <button class="user-menu-button" aria-label="User menu">
    <span class="user-menu-avatar">DS</span>  <!-- initials -->
  </button>

  <!-- Dropdown (rendered when open) -->
  <div class="user-menu-dropdown">
    <!-- Header row -->
    <div class="user-menu-header">
      <span class="user-menu-avatar user-menu-avatar--large">DS</span>
      <div class="user-menu-info">
        <div class="user-menu-name">David Seguin</div>
        <div class="user-menu-email">david@example.com</div>
        <span class="user-menu-badge">Admin</span>
      </div>
    </div>

    <div class="user-menu-divider"></div>

    <!-- Items -->
    <button class="user-menu-item">
      <!-- gear SVG icon --> Settings
    </button>
    <button class="user-menu-item user-menu-item--danger">
      <!-- logout SVG icon --> Logout
    </button>
  </div>
</div>
```

### CSS

```css
.user-menu-wrapper { position: relative; }

/* Button */
.user-menu-button {
  background: none;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.user-menu-button:hover { border-color: var(--accent-color); }

/* Avatar */
.user-menu-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-color), #ff8f6b);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  text-transform: uppercase;
  flex-shrink: 0;
}
.user-menu-avatar--large {
  width: 40px; height: 40px;
  font-size: 1rem;
}

/* Dropdown */
.user-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: userMenuFadeIn 0.15s ease-out;
  overflow: hidden;
}

/* Header section */
.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
}
.user-menu-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.user-menu-name  { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
.user-menu-email { font-size: 0.8rem; color: var(--text-secondary); }

/* Badge */
.user-menu-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: linear-gradient(135deg, var(--accent-color), #ff8f6b);
  color: white;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
}

/* Divider */
.user-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0;
}

/* Items */
.user-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 0;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  text-align: left;
  transition: background-color 0.15s ease;
}
.user-menu-item:hover { background: var(--bg-secondary); }
.user-menu-item svg { width: 18px; height: 18px; flex-shrink: 0; }

.user-menu-item--danger { color: var(--danger-color); }
.user-menu-item--danger:hover { background: rgba(220, 53, 69, 0.1); }
```

---

## Theme Toggle (Light / Dark)

A circular icon button placed immediately to the left of the user menu button. The button rotates 180° on hover. The icon swaps between a sun and moon SVG.

```html
<button class="theme-toggle" aria-label="Toggle theme" title="Toggle light/dark mode">
  <svg class="theme-icon"> <!-- sun or moon SVG --> </svg>
</button>
```

```css
.theme-toggle {
  background: none;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
  padding: 0;
}
.theme-toggle:hover {
  border-color: var(--accent-color);
  transform: rotate(180deg);
}

.theme-icon {
  width: 20px; height: 20px;
  transition: transform 0.3s ease;
}
```

**Persistence:** store `"dark"` / `"light"` in `localStorage` under the key `darkMode`. Apply `data-theme="dark"` attribute to `<html>` or `<body>` element. All color variables switch via attribute selector:

```css
[data-theme='dark'] {
  --bg-primary: #1A1A1A;
  /* … all dark overrides … */
}
```

---

## System Metrics Button & Dropdown

A square icon button in the header actions group. When active (dropdown open), it fills with the accent color. A small green status dot sits in the top-right corner of the button when the backend is healthy.

### Structure

```html
<div class="metrics-wrapper">
  <button class="metrics-dropdown-button" aria-label="System Metrics">
    <svg class="metrics-icon"> <!-- chart/bar-chart SVG --> </svg>
    <span class="metrics-status-dot metrics-status-dot--healthy"></span>
  </button>

  <!-- Dropdown (rendered when open) -->
  <div class="metrics-dropdown-panel">

    <div class="metrics-dropdown-header">
      <h3 class="metrics-dropdown-title">System Metrics</h3>
      <div class="metrics-status-badge">
        <span class="status-dot status-dot--healthy"></span>
        <span class="status-text">Healthy</span>
      </div>
    </div>

    <div class="metrics-dropdown-content">

      <!-- Hero: uptime -->
      <div class="metrics-uptime">
        <div class="metrics-uptime-value">14d 3h</div>
        <div class="metrics-uptime-label">System Uptime</div>
      </div>

      <!-- 2×2 stat cards -->
      <div class="metrics-stats-grid">
        <div class="metrics-stat-card">
          <div class="metrics-stat-icon metrics-stat-icon--requests"><!-- SVG --></div>
          <div>
            <div class="metrics-stat-value">1 234</div>
            <div class="metrics-stat-label">Requests</div>
          </div>
        </div>
        <!-- jobs, queue, avg time cards … -->
      </div>

      <!-- Progress bars -->
      <div class="metrics-progress-item">
        <div class="metrics-progress-row">
          <span class="metrics-progress-label">Cache Hit Rate</span>
          <span class="metrics-progress-value">72%</span>
        </div>
        <div class="metrics-progress-bar">
          <div class="metrics-progress-fill metrics-progress-fill--cache" style="width: 72%"></div>
        </div>
      </div>
      <!-- workers, storage, backend progress items … -->

    </div>
  </div>
</div>
```

### CSS

```css
.metrics-wrapper { position: relative; }

/* Button */
.metrics-dropdown-button {
  background: none;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  width: 44px; height: 44px;
  padding: 0;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  color: var(--text-primary);
}
.metrics-dropdown-button:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.metrics-dropdown-button.active {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: white;
}
.metrics-icon { width: 22px; height: 22px; transition: transform 0.2s ease; }
.metrics-dropdown-button:hover .metrics-icon { transform: scale(1.1); }

/* Status dot on button */
.metrics-status-dot {
  position: absolute;
  top: -3px; right: -3px;
  width: 12px; height: 12px;
  border-radius: 50%;
  border: 2px solid var(--background-card);
  background: var(--text-secondary);
}
.metrics-status-dot--healthy {
  background: #4CAF50;
  animation: pulse-healthy 2s infinite;
}
@keyframes pulse-healthy {
  0%   { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
  70%  { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}

/* Panel */
.metrics-dropdown-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  background: var(--background-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
  animation: metrics-slide-in 0.2s ease;
}

.metrics-dropdown-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.metrics-dropdown-title {
  font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;
}

.metrics-status-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
.status-text { font-size: 12px; font-weight: 600; color: var(--text-secondary); }

.metrics-dropdown-content {
  padding: 20px;
  max-height: 480px;
  overflow-y: auto;
}

/* Uptime hero */
.metrics-uptime {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--accent-color), var(--accent-color-hover));
  border-radius: 12px;
  color: white;
}
.metrics-uptime-value {
  font-size: 36px; font-weight: 800;
  line-height: 1; letter-spacing: -1px;
}
.metrics-uptime-label {
  font-size: 13px; font-weight: 500;
  opacity: 0.9; margin-top: 6px;
  text-transform: uppercase; letter-spacing: 1px;
}

/* Stats grid */
.metrics-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.metrics-stat-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.metrics-stat-card:hover {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}
.metrics-stat-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
/* Icon color variants */
.metrics-stat-icon--requests     { background: rgba(33,150,243,0.15); color: #2196F3; }
.metrics-stat-icon--jobs         { background: rgba(76,175,80,0.15);  color: #4CAF50; }
.metrics-stat-icon--queue        { background: rgba(255,152,0,0.15);  color: #FF9800; }
.metrics-stat-icon--time         { background: rgba(156,39,176,0.15); color: #9C27B0; }

.metrics-stat-value { font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.metrics-stat-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-top: 2px; }

/* Progress items */
.metrics-progress-item {
  padding: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 8px;
}
.metrics-progress-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.metrics-progress-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.metrics-progress-value { font-size: 13px; font-weight: 700; color: var(--accent-color); }
.metrics-progress-bar {
  height: 8px;
  background: var(--background-input);
  border-radius: 4px;
  overflow: hidden;
}
.metrics-progress-fill {
  height: 100%; border-radius: 4px;
  transition: width 0.5s ease;
}
.metrics-progress-fill--cache   { background: linear-gradient(90deg, #4CAF50, #8BC34A); }
.metrics-progress-fill--workers { background: linear-gradient(90deg, #2196F3, #03A9F4); }
.metrics-progress-fill--storage { background: linear-gradient(90deg, #9C27B0, #E91E63); }
.metrics-progress-fill--backend { background: linear-gradient(90deg, var(--accent-color), var(--accent-color-hover)); }
```

---

## Settings Modal

Opened from the user menu → Settings item. It is a full modal overlay with a tabbed interface.

### Top-level Tabs

| Tab | Sub-tabs (if any) | Content |
|---|---|---|
| **Settings** | — | App-specific configuration |
| **Preferences** | Language · PDF · Appearance · Batch | User preferences |
| **Appearance** | — | Accent color picker, theme, density |

> The **Appearance** sub-tab (under Preferences) presents the accent color swatches described in the Color System section. Selecting a swatch updates `--accent-color` in real time and saves to `localStorage`.

### Structure (abbreviated)

```html
<div class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-content modal-content--large">

    <div class="modal-header">
      <h2>Settings</h2>
      <button class="modal-close" aria-label="Close">×</button>
    </div>

    <!-- Top-level tab bar -->
    <div class="settings-tabs" role="tablist">
      <button class="settings-tab settings-tab--active" role="tab">Settings</button>
      <button class="settings-tab" role="tab">Preferences</button>
    </div>

    <div class="modal-body">

      <!-- When "Preferences" tab is active, show sub-tabs -->
      <div class="dashboard-subtabs">
        <button class="dashboard-subtab">Language</button>
        <button class="dashboard-subtab dashboard-subtab--active">Appearance</button>
        <button class="dashboard-subtab">Advanced</button>
      </div>

      <!-- Appearance sub-tab content -->
      <div class="settings-section">
        <h3>Accent Color</h3>
        <p class="settings-description">Choose the primary accent color used throughout the app.</p>
        <div class="accent-color-swatches">
          <!-- one .accent-swatch per preset color -->
          <button class="accent-swatch accent-swatch--active"
                  style="background: #FF6B35"
                  title="Orange"
                  aria-label="Orange accent">
          </button>
          <!-- … more swatches … -->
        </div>
      </div>

      <div class="settings-section">
        <h3>Theme</h3>
        <p class="settings-description">Switch between light and dark mode.</p>
        <!-- Toggle switch (same pattern as elsewhere) -->
      </div>

    </div><!-- /.modal-body -->

    <div class="modal-footer">
      <div></div>
      <div class="modal-footer-buttons">
        <button class="btn btn-secondary">Cancel</button>
        <button class="btn btn-primary">Save Changes</button>
      </div>
    </div>

  </div>
</div>
```

### CSS

```css
/* Tab bar */
.settings-tabs {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
}
.settings-tab {
  flex: 1;
  padding: 0.875rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  bottom: -2px;
}
.settings-tab:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}
.settings-tab--active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
  font-weight: 600;
}

/* Sub-tabs (pill style) */
.dashboard-subtabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.25rem;
  background: var(--background-secondary);
  border-radius: 8px;
  width: fit-content;
}
.dashboard-subtab {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}
.dashboard-subtab:hover { color: var(--text-primary); background: var(--background-input); }
.dashboard-subtab--active {
  color: white;
  background: var(--accent-color);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Sections */
.settings-section { margin-bottom: 32px; }
.settings-section:last-child { margin-bottom: 0; }
.settings-section h3 {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.settings-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.5;
}

/* Accent swatches */
.accent-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.accent-swatch {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.accent-swatch:hover { transform: scale(1.15); }
.accent-swatch--active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--background-card), 0 0 0 4px var(--text-primary);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--border-color);
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  left: 3px; bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.toggle-switch input:checked + .toggle-slider { background: var(--accent-color); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
```

---

## Buttons

Three semantic variants plus size modifiers.

```css
.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Primary */
.btn-primary {
  background: var(--accent-color);
  color: white;
}
.btn-primary:not(:disabled):hover {
  background: var(--accent-color-hover);
  transform: translateY(-1px);
}

/* Secondary */
.btn-secondary {
  background: var(--background-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-secondary:not(:disabled):hover { background: var(--border-hover); }

/* Danger */
.btn-danger {
  background: var(--danger-color);
  color: white;
  border: 1px solid var(--danger-color);
}
.btn-danger:not(:disabled):hover {
  background: #c82333;
  transform: translateY(-1px);
}

/* Size modifiers */
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-lg { padding: 14px 28px; font-size: 16px; border-radius: 8px; }
.btn-icon { padding: 8px; border-radius: 6px; }        /* square icon button */
```

---

## Form Inputs & Selects

```css
.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-input);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
  appearance: none;
}
.form-input::placeholder { color: var(--text-placeholder); }
.form-input:hover,
.form-select:hover  { border-color: var(--border-hover); }
.form-input:focus,
.form-select:focus  { border-color: var(--accent-color); background: var(--background-input); }

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group { margin-bottom: 1rem; }
```

---

## Cards & Containers

```css
.card {
  background: var(--background-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}
.card--accent:hover { border-color: var(--accent-color); }
```

---

## Modals & Dialogs

### Full Modal (Settings, Analysis, etc.)

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-in-out;
}
.modal-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}
.modal-content--large { max-width: 800px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.modal-header h2 { font-size: 24px; color: var(--text-primary); margin: 0; }

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.modal-close:hover { background: var(--background-input); color: var(--text-primary); }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
.modal-footer-buttons { display: flex; gap: 12px; }
```

### Confirmation Dialog (smaller, for destructive actions)

```css
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}
.dialog-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  border: 1px solid var(--border-color);
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}
.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-input);
}
.dialog-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0; }
.dialog-body  { padding: 24px; }
.dialog-message { font-size: 15px; line-height: 1.6; color: var(--text-primary); white-space: pre-line; }
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--background-input);
}
```

Dialog icon colors by type:

| Type | Color |
|---|---|
| warning / confirm | `#FF9800` |
| error | `#F44336` |
| success | `#4CAF50` |
| info | `#2196F3` |

---

## Toast Notifications

Toasts appear centered-top (or centered-bottom). Only one toast is visible at a time.

```css
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 24px;
  z-index: 10001;
  max-width: 600px;
  width: 90%;
  animation: slideInDown 0.3s ease-out;
  pointer-events: none;
}
.toast {
  background: var(--background-card);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  pointer-events: all;
}

/* Border-left accent per type */
.toast--error   { border-left-color: #F44336; }
.toast--warning { border-left-color: #FF9800; }
.toast--success { border-left-color: #4CAF50; }
.toast--info    { border-left-color: #2196F3; }

.toast-icon { width: 24px; height: 24px; flex-shrink: 0; }
.toast--error   .toast-icon { color: #F44336; }
.toast--warning .toast-icon { color: #FF9800; }
.toast--success .toast-icon { color: #4CAF50; }
.toast--info    .toast-icon { color: #2196F3; }

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}
.toast-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.toast-close:hover { background: var(--background-input); color: var(--text-primary); }
```

---

## Status Badges

Inline pill badges for state indication.

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.status-badge--success { background: rgba(40,167,69,0.2);  color: #28a745; }
.status-badge--error   { background: rgba(255,68,68,0.2);  color: #FF4444; }
.status-badge--warning { background: rgba(255,165,0,0.2);  color: #FFA500; }
.status-badge--info    { background: rgba(23,162,184,0.2); color: #17a2b8; }
```

---

## Tooltips

Tooltips appear above the target element by default. They support an optional `<kbd>` shortcut pill.

```css
.tooltip-wrapper { position: relative; display: inline-flex; }

.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  background: var(--text-primary);
  color: var(--background-card);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.tooltip-wrapper:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.tooltip-shortcut {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  margin-left: 6px;
}
```

---

## Scrollbars

Apply globally so scrollbars match the theme.

```css
::-webkit-scrollbar       { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--background-input); border-radius: 5px; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }
```

---

## Skeleton Loaders

Use while content is loading. Replace the final element's exact shape with a `.skeleton` div at the same dimensions.

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--background-input) 25%,
    var(--border-color) 50%,
    var(--background-input) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 6px;
}
```

---

## Icons

**All icons are Google Material Symbols SVGs stored locally.**

- Variant: **Outlined**, FILL@0; wght@400; GRAD@0; opsz@24
- Browse at: https://fonts.google.com/icons
- Store in: `frontend/src/assets/icons/`
- Render as inline `<svg>` or via `<img>` with `width`/`height` attributes
- **Never** use Heroicons, FontAwesome, or emoji as icons

Icon sizes in the header: **20–22 px**. Inline with text: **18 px**. Large decorative: **32–48 px**.

Color icons via `color: currentColor` on the SVG (set `fill="currentColor"` on paths).

---

## Responsive Breakpoints

| Breakpoint | Max-width | Changes |
|---|---|---|
| Desktop | > 968px | Full two-column layouts, all panel features |
| Tablet | ≤ 968px | Single-column content areas, stacked language bar |
| Small tablet | ≤ 768px | Settings tabs go vertical (left border indicator instead of bottom); dialog full-width; metrics panel full-width fixed |
| Mobile | ≤ 640px | Reduced padding (1rem), smaller fonts |
| Small mobile | ≤ 480px | Metrics hero font 28px |

```css
/* Settings tabs on small screens */
@media (max-width: 768px) {
  .settings-tabs { flex-direction: column; }
  .settings-tab  {
    border-bottom: none;
    border-left: 3px solid transparent;
    text-align: left;
  }
  .settings-tab--active { border-left-color: var(--accent-color); }

  .metrics-dropdown-panel {
    position: fixed;
    top: 60px; right: 8px; left: 8px;
    width: auto;
  }
  .metrics-stats-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .header { padding: 1rem; }
}
```

---

## Accessibility

### Focus Ring

```css
:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

### Disabled State

```css
button:disabled,
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(50%);
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Selection Color

```css
::selection        { background: var(--accent-color); color: white; }
::-moz-selection   { background: var(--accent-color); color: white; }
```

### ARIA Requirements

- All icon-only buttons: `aria-label`
- Modal/dialog root: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Tab bars: `role="tablist"` on container, `role="tab"` on buttons, `aria-selected`
- Toggles: `aria-expanded` on trigger buttons
- Status dots: `aria-label="Status: Healthy"` (not conveyed by color alone)

---

## CSS Variable Reference

Paste this block into `:root` and `[data-theme='dark']` of the new app's main CSS file.

```css
:root {
  /* Accent (overridden by ThemeContext at runtime) */
  --accent-color:       #FF6B35;
  --accent-color-hover: #FF7F50;
  --accent-color-light: #FFA07A;
  /* Aliases used throughout components */
  --primary-color:       var(--accent-color);
  --primary-color-dark:  var(--accent-color-hover);
  --primary-orange:      var(--accent-color);
  --primary-orange-hover: var(--accent-color-hover);
  --primary-orange-light: var(--accent-color-light);

  /* Semantic */
  --danger-color:         #dc3545;
  --accent-warning:       #f0ad4e;
  --accent-warning-hover: #ec971f;

  /* Backgrounds */
  --bg-primary:          #F5F5F5;
  --bg-secondary:        #EFEFEF;
  --bg-tertiary:         #FFFFFF;
  --background-main:     #F5F5F5;
  --background-card:     #FFFFFF;
  --background-input:    #FFFFFF;

  /* Text */
  --text-primary:       #1A1A1A;
  --text-secondary:     #666666;
  --text-placeholder:   #999999;

  /* Borders */
  --border-color:  #E0E0E0;
  --border-hover:  #CCCCCC;

  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
}

[data-theme='dark'] {
  --danger-color:         #ff6b6b;
  --accent-warning:       #f39c12;
  --accent-warning-hover: #e67e22;

  --bg-primary:          #1A1A1A;
  --bg-secondary:        #252525;
  --bg-tertiary:         #2A2A2A;
  --background-main:     #1A1A1A;
  --background-card:     #2A2A2A;
  --background-input:    #333333;

  --text-primary:       #FFFFFF;
  --text-secondary:     #CCCCCC;
  --text-placeholder:   #888888;

  --border-color:  #404040;
  --border-hover:  #555555;

  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

---

## ThemeContext Implementation

Create `src/contexts/ThemeContext.js`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ACCENT_PRESETS = [
  { name: 'Orange',  hex: '#FF6B35' },
  { name: 'Blue',    hex: '#2196F3' },
  { name: 'Green',   hex: '#4CAF50' },
  { name: 'Purple',  hex: '#9C27B0' },
  { name: 'Red',     hex: '#F44336' },
  { name: 'Teal',    hex: '#009688' },
  { name: 'Pink',    hex: '#E91E63' },
  { name: 'Amber',   hex: '#FFC107' },
  { name: 'Indigo',  hex: '#3F51B5' },
  { name: 'Cyan',    hex: '#00BCD4' },
];

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function deriveAccentVariants(hex) {
  const [h, s, l] = hexToHsl(hex);
  return {
    base:  hex,
    hover: hslToHex(h, Math.min(s + 10, 100), Math.min(l + 10, 85)),
    light: hslToHex(h, Math.max(s - 20, 30),  Math.min(l + 25, 90)),
  };
}

function applyAccent(hex) {
  const { base, hover, light } = deriveAccentVariants(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent-color',       base);
  root.style.setProperty('--accent-color-hover', hover);
  root.style.setProperty('--accent-color-light', light);
  // aliases
  root.style.setProperty('--primary-color',        base);
  root.style.setProperty('--primary-color-dark',   hover);
  root.style.setProperty('--primary-orange',       base);
  root.style.setProperty('--primary-orange-hover', hover);
  root.style.setProperty('--primary-orange-light', light);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('darkMode') === 'true'
  );
  const [accentColor, setAccentColorState] = useState(
    () => localStorage.getItem('accentColor') || '#FF6B35'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
  }, [isDark]);

  useEffect(() => {
    applyAccent(accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const toggleTheme = () => setIsDark(d => !d);
  const setAccentColor = hex => setAccentColorState(hex);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, accentColor, setAccentColor, ACCENT_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { ACCENT_PRESETS };
```

Wrap the app root with `<ThemeProvider>` in `index.js`.

---

## File & Folder Conventions

```
src/
  assets/
    icons/          ← local SVG icons (Google Material Symbols Outlined)
  components/
    Header.js       ← top bar
    LeftPanel.js    ← slide-in navigation
    UserMenu.js     ← top-right avatar dropdown
    ThemeToggle.js  ← light/dark button
    MetricsDropdown.js
    Settings.js     ← full settings modal
    Dialog.js       ← confirmation dialogs
    Toast.js        ← notification toasts
  contexts/
    ThemeContext.js
  services/
    api.js          ← all HTTP calls, credentials: 'include'
  utils/
    logger.js       ← unified logger (never use console.log directly)
  styles/
    App.css         ← global CSS variables, keyframes, layout, utility classes
    Dialog.css      ← Dialog + Toast component styles
```

Each JS/JSX file must have a JSDoc file header with `@author`, `@version`, `@fileoverview`, Key Features, Dependencies, Security Considerations, and Performance Notes sections.

---

*End of Style Guide*
