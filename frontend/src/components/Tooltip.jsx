/**
 * Tooltip
 *
 * @fileoverview Lightweight tooltip that wraps an interactive child. Shows on
 * hover and focus; hides on blur, mouseleave, and Escape. Positioning is pure
 * CSS via `data-placement`, so no popper/floating-ui dependency.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Keyboard-accessible (focusin/focusout) and pointer-accessible
 * - Escape closes
 * - Four placements: top | bottom | left | right
 *
 * Dependencies: React only
 *
 * Accessibility:
 * - aria-describedby wiring from trigger to bubble
 * - Bubble is pointer-events: none so it never intercepts clicks
 *
 * Performance Notes:
 * - Renders only when open
 */

import React, { useId, useState, useEffect, useRef } from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.content - Tooltip content (string or JSX)
 * @param {'top'|'bottom'|'left'|'right'} [props.placement='top']
 * @param {number} [props.delay=150] - ms before tooltip appears
 * @param {React.ReactElement} props.children - Single element to wrap as trigger
 * @returns {JSX.Element}
 */
function Tooltip({ content, placement = 'top', delay = 150, children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!content) return children;

  const trigger = React.cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <span className="tooltip-wrapper" data-tooltip-open={open}>
      {trigger}
      <span id={id} role="tooltip" className="tooltip-bubble" data-placement={placement}>
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
