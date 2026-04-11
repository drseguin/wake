# Application Development Rules and Standards

This file defines mandatory rules to follow when building a new application. Copy it into the new project's `documentation/` folder and adjust the app-specific placeholders (marked `[APP]`) before use.

---

## Table of Contents

1. [Mandatory Rules](#mandatory-rules)
   - [File Header Documentation](#1-file-header-documentation)
   - [Function Documentation](#2-function-documentation)
   - [Inline Help Content](#3-inline-help-content)
   - [Configuration Schema Updates](#4-configuration-schema-updates)
   - [Debug Logging Standards](#5-debug-logging-standards)
   - [Error Handling Documentation](#6-error-handling-documentation)
   - [Security Documentation Updates](#7-security-documentation-updates)
2. [Automated Checks & Best Practices](#automated-checks--best-practices)
3. [Pre-Commit Checklist](#pre-commit-checklist)
4. [UI/UX Design Standards](#uiux-design-standards)
5. [Quality Gates](#quality-gates)

---

## Mandatory Rules

### 1. File Header Documentation

**RULE: Every source file must have a comprehensive JSDoc header.**

Apply to any `.js`, `.jsx`, `.ts`, `.tsx`, or similar file when:

- Creating new files
- Adding new major functionality (> 50 lines)
- Changing core architectural patterns
- Modifying security-related code
- Adding new dependencies
- Changing API integrations

```javascript
/**
 * [Descriptive Title of File/Component]
 *
 * @fileoverview [Detailed description of file purpose, key functionality,
 * architectural role, and integration with other components. Explain the 'why'
 * not just the 'what'.]
 *
 * @author David Seguin
 * @version 1.0.0
 * @since [YEAR]
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - [List major capabilities and features]
 * - [Focus on what makes this file unique/important]
 * - [Include architectural significance]
 * - [Mention integration points]
 *
 * Dependencies:
 * - [List major external dependencies]
 * - [Internal module dependencies]
 * - [API integrations]
 *
 * Security Considerations:
 * - [Any security-relevant aspects]
 * - [Data handling and validation]
 * - [Secure network communication]
 *
 * Performance Notes:
 * - [Performance considerations]
 * - [Resource usage patterns]
 * - [Optimization strategies]
 */
```

---

### 2. Function Documentation

**RULE: All exported functions and complex internal functions must have JSDoc.**

Mandatory for: exported functions, event handlers, API endpoints, service functions, configuration management functions, security-related functions.

```javascript
/**
 * Brief description of what the function does.
 *
 * @param {Type} paramName - Description including validation rules and constraints
 * @param {Object} options - Configuration object
 * @param {boolean} [options.optional] - Optional parameter with default behavior
 * @returns {Promise<Type>} Description of return value and possible states
 * @throws {Error} When specific error conditions occur
 *
 * @example
 * const result = await functionName(data, { optional: true });
 * console.log(result.status);
 *
 * @since 1.0.0
 * @security Handles sensitive data — ensure proper validation
 * @performance Real-time path — keep under 10 ms
 */
```

---

### 3. Inline Help Content

**RULE: When modifying UI components, update the corresponding help/tooltip content.**

- Tooltip and description content lives **inline in each component** — there is no centralized help file.
- Update triggers: adding new settings/options, changing feature behaviour, modifying UI layouts, adding accessibility features, changing performance characteristics.

Help content must include:
- Clear, non-technical explanation for end users
- Technical details for advanced users
- Best practice recommendations
- Performance and security implications where relevant

---

### 4. Configuration Schema Updates

**RULE: Every new configuration field must be wired end-to-end.**

When adding or modifying configuration:

1. Add the field and its default value to the backend configuration defaults (the `_get_default_config()` equivalent for the new app).
2. Update configuration validation.
3. Add the corresponding UI control to the Settings screen so "Save Changes" persists it correctly.
4. Update any service or component that reads the field.
5. Add JSDoc / docstrings to the configuration manager.

Existing config files must automatically receive missing default values on load — never require manual migration for additive changes.

---

### 5. Debug Logging Standards

**RULE: All significant operations must use the unified logger (never raw `console.log` or `print`).**

#### Prefix Convention

Choose a short, project-specific prefix (e.g., the initials of the project name) and apply it consistently. The prefix makes log lines easily grep-able and distinguishes application logs from framework/library noise.

Example: for a project called **MyApp** use prefix `MA:`.

```
MA: [LEVEL] message
```

#### Frontend (JavaScript / React)

```javascript
import { logger } from './utils/logger';

logger.debug('Loading data from API');
logger.info(`Loaded ${count} records`);
logger.warn('No data found, using defaults');
logger.error('Failed to load data:', error);
```

#### Backend (Python / Flask)

```python
from utils.logger import logger

logger.debug(f"Loading configuration from {config_path}")
logger.info(f"Request: {source} -> {target}")
logger.error(f"Error processing request: {str(e)}")
```

#### When to log

1. **Before** API calls
2. **After** API responses (success and failure)
3. **Before** state updates in React components
4. **After** critical operations complete
5. **In catch blocks** before re-throwing or handling errors
6. **At function entry** for complex operations
7. **Before** file system operations
8. **After** configuration changes

#### Do NOT use

```javascript
// BAD
console.log('Loading...');
console.log('MA: Fetching data');   // raw console.log, not the logger utility
```

```python
# BAD
print("Loading")
print(f"MA: Error: {e}")
```

---

### 6. Error Handling Documentation

**RULE: All error conditions must be documented with user guidance.**

```javascript
/**
 * @throws {ValidationError} When input validation fails — user should check format
 * @throws {NetworkError} When API calls fail — user should verify connectivity
 * @throws {AuthenticationError} When credentials are invalid — user should update them
 */
```

Pattern:

```javascript
try {
  logger.debug('Attempting to load resource');
  const response = await fetch('/api/v1/resource');

  if (!response.ok) {
    logger.error(`API error: ${response.status} ${response.statusText}`);
    throw new Error('Failed to load resource');
  }

  const data = await response.json();
  logger.info(`Resource loaded: ${data.items.length} items`);
  return data;
} catch (err) {
  logger.error('Exception during resource load:', err.message);
  logger.warn('Falling back to empty state');
  return { items: [] };
}
```

---

### 7. Security Documentation Updates

**RULE: Any security-related change must update security documentation.**

Security-sensitive areas:
- API key and token management
- Encryption / decryption
- File system access
- Network communications
- User input validation and sanitisation
- File upload and processing

Must document:
- Security implications of the change
- Data protection measures
- Secure network communication approach
- Compliance requirements (if any)

---

## Automated Checks & Best Practices

### Code Quality

- **ESLint / Pylint** — fix all linting errors before committing
- **Type safety** — add proper TypeScript or Python type hints
- **Performance** — document any significant performance impacts
- **Memory management** — note memory usage patterns for long-running or real-time operations
- **Error boundaries** — implement proper error handling for UI components

### Testing Requirements

- **Unit tests** for new utility functions
- **Integration tests** for service / API changes
- **Manual testing** for UI changes
- **Performance testing** for high-frequency operations
- **Security testing** for authentication / authorisation changes

### Documentation Maintenance

**RULE: Update markdown documentation immediately after completing code changes — in the same commit.**

Triggers (substantial changes):
- New features or functionality
- Modified APIs or interfaces
- Changed architectural patterns
- Added or removed dependencies
- Modified configuration options
- Changed performance characteristics
- Updated build / deployment processes
- Modified security measures

**Documentation files to keep synchronised:**

| File | Update when |
|---|---|
| `README.md` | New features, setup changes, dependency changes |
| `CLAUDE.md` | Architecture changes, workflow changes, new components |
| `documentation/APP_DEVELOPMENT_RULES.md` (this file) | New coding standards, mandatory rules |
| `documentation/DESIGN_ARCHITECTURE.md` | System architecture, data flows, integration patterns |
| Other specialised docs | As relevant to the change |

---

## Pre-Commit Checklist

- [ ] File headers updated on all modified files
- [ ] Function documentation complete for new/modified functions
- [ ] Help/tooltip content updated for UI changes
- [ ] Configuration changes propagated end-to-end (defaults → validation → UI → service)
- [ ] Error conditions documented with user guidance
- [ ] Security implications documented for sensitive changes
- [ ] Performance impact assessed for real-time / high-frequency paths
- [ ] All existing tests pass
- [ ] No linting errors or warnings
- [ ] New dependencies added to headers and docs

---

## UI/UX Design Standards

### 1. Design System Consistency

**Color:**
- Define all colors as CSS custom properties (`--variable-name`)
- Use semantic naming (`--text-primary`, `--background-card`, `--accent-color`)
- Maintain consistent usage across light and dark themes
- Define state-specific colors: hover, active, disabled, error, success, warning, info
- Target WCAG AA contrast ratios minimum (4.5:1 for normal text, 3:1 for large text)

**Typography:**
- 3–5 font size levels with clear hierarchy
- Consistent font-weight variants: 400 regular, 500 medium, 600 semibold, 700 bold
- Line-height 1.5–1.8 for body text
- Letter-spacing adjustments for headings and uppercase micro-labels

**Spacing:**
- Base-8 scale: `4 8 12 16 24 32 48 px`
- Apply via CSS variables or utility classes for maintainability

**Border Radius:**
- Standardise: 4 px small · 6 px medium · 8 px default · 12 px large · 16 px extra-large · 50% circular

**Shadows:**
- Three levels: `--shadow-sm` (subtle) · `--shadow-md` (cards) · `--shadow-lg` (modals/overlays)
- Adjust opacity for dark mode

---

### 2. Interactive Elements & Micro-interactions

**Button States:**
- Default → Hover (color shift + `translateY(-1px)`) → Active (`scale(0.98)`) → Disabled (50–60% opacity + `grayscale` + `not-allowed`)
- Focus: `outline: 2px solid var(--accent-color); outline-offset: 2px`

**Animation Principles:**
- `ease-out` for entrances, `ease-in` for exits
- Durations: 150–200 ms micro-interactions · 300 ms transitions · 500 ms complex
- Use `transform` and `opacity` for GPU-accelerated animations
- Always respect `prefers-reduced-motion`

**Hover Effects:**
- Transitions on all interactive elements
- Icon rotations (180° for arrows, 360° for refresh)
- Subtle scale (`1.05–1.1`)
- Color shift to accent

---

### 3. Form & Input Design

**Inputs:**
- Clear visual states: default, focus (accent border), error (red border + message), disabled (reduced opacity)
- Placeholder text via `--text-placeholder`
- Character counters with color transitions for limits

**Validation Feedback:**
- Real-time, debounced 300–500 ms
- Success: green border + checkmark icon
- Error: red border + error icon + descriptive message (never just "Invalid input")
- Shake animation on invalid submit attempt

---

### 4. Loading & Empty States

**Loading:**
- Skeleton screens matching the layout being loaded (shimmer/pulse effect)
- Spinners for short indeterminate waits
- Progress bars with percentage for multi-step operations
- Maintain element dimensions during load to prevent layout shift

**Empty States:**
- Illustrative icon
- Clear explanatory text (not "Nothing here")
- Call-to-action button
- Friendly, non-blaming tone

---

### 5. Feedback & Notifications

**Toast Notifications:**
- 4 types: success (green) · error (red) · warning (orange) · info (blue)
- Left border 4 px accent matches type color
- Auto-dismiss 3–5 s; manual close button always present
- Slide-in from top-center; single toast visible at a time

**Status Badges:**
- Pill shape, uppercase, letter-spacing 0.5 px
- Background: 20% opacity of the status color; text: full status color
- Never convey status by color alone — pair with icon or text label

---

### 6. Accessibility (WCAG 2.1 AA minimum)

**Keyboard Navigation:**
- All interactive elements reachable by Tab
- Logical tab order following visual flow
- Escape closes modals / dropdowns
- Enter confirms dialogs

**Semantic HTML:**
- `<nav>`, `<main>`, `<aside>`, `<section>`, `<article>` as appropriate
- `aria-label` on all icon-only buttons
- `aria-expanded` / `aria-selected` on toggles and tabs
- `role="dialog"` + `aria-modal="true"` on modals
- `aria-live` regions for dynamic content updates

**Color & Contrast:**
- Never rely on color alone — pair with icon or text
- Test with a color-blindness simulator before shipping

**Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 7. Responsive Design

| Breakpoint | Width |
|---|---|
| Mobile | 320 – 767 px |
| Tablet | 768 – 1023 px |
| Desktop | 1024 – 1439 px |
| Large desktop | 1440 px+ |

**Mobile:**
- Minimum touch target: 48 × 48 px
- Minimum font size: 16 px (prevents auto-zoom on iOS)
- Stack layouts vertically; hamburger nav

**Tablet:**
- Collapsible sidebar panels
- Adaptive grid columns

---

### 8. Dark Mode

- All colors defined as CSS custom properties; dark theme switches values via `[data-theme='dark']` attribute selector
- Smooth transition: `transition: background-color 0.3s ease, color 0.3s ease`
- Preference persisted in `localStorage` under `darkMode`
- Respect `prefers-color-scheme` as the initial default

---

### 9. Modal & Overlay Design

- Backdrop: `rgba(0, 0, 0, 0.5)` + `backdrop-filter: blur(10px)`
- Entrance: `fadeIn` overlay + `slideIn` (translateY + opacity) content panel
- Close on: Escape key · backdrop click · explicit close button
- Trap focus within modal while open; restore focus on close
- Resizable side panels: drag handle on edge, store width in `localStorage`

---

### 10. Icon System

**MANDATORY: Use only Google Material Symbols, stored locally as SVG.**

The app may run in air-gapped environments — never load icons from a CDN.

| Setting | Value |
|---|---|
| Variant | Outlined |
| Fill | 0 |
| Weight | 400 |
| Grade | 0 |
| Optical size | 24 |
| Storage | `frontend/src/assets/icons/` |

**Download → Save → Import:**

```javascript
import { ReactComponent as AddIcon } from '../assets/icons/add.svg';

<button aria-label="Add item">
  <AddIcon className="icon" />
  Add
</button>
```

```css
.icon          { width: 20px; height: 20px; fill: currentColor; flex-shrink: 0; }
.icon-sm       { width: 16px; height: 16px; }
.icon-lg       { width: 24px; height: 24px; }
.icon-xl       { width: 32px; height: 32px; }
```

**Prohibited:** Heroicons · Feather Icons · Font Awesome · emoji as functional icons · mixed icon libraries.

---

### 11. Copywriting & Microcopy

| Context | Rule |
|---|---|
| Button text | Action verbs, 1–3 words (Save / Delete / Continue — not "OK") |
| Error messages | Explain what went wrong + how to fix it; no jargon |
| Empty states | Friendly tone, explain why empty, clear CTA |
| Help text | Concise, scannable, examples where helpful |

---

### 12. UI Polish Checklist

Before considering a UI feature complete:

- [ ] All interactive elements have hover, focus, active, and disabled states
- [ ] Loading states implemented for all async operations
- [ ] Empty states designed for all lists and collections
- [ ] Error states handled with helpful, actionable messages
- [ ] Success feedback provided for all user actions
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Keyboard navigation fully functional
- [ ] WCAG AA contrast ratios achieved
- [ ] Dark mode fully implemented and tested
- [ ] Responsive layout tested at all breakpoints
- [ ] Touch targets ≥ 48 × 48 px on mobile
- [ ] Icons consistent in style and size (Material Symbols Outlined)
- [ ] Typography hierarchy clear at all breakpoints
- [ ] Spacing consistent throughout
- [ ] Tooltips provided for all icon-only buttons
- [ ] Copy is clear, concise, and action-oriented

---

## Quality Gates

Code cannot be merged without:

1. Updated file headers on all modified files
2. Complete JSDoc for all new / modified functions
3. Updated help content for user-facing changes
4. All automated tests passing
5. Security review completed for sensitive changes
6. Performance impact assessed for real-time components

---

*Copy this file into a new project's `documentation/` folder. Replace `[APP]` placeholders and the logging prefix with project-specific values.*
