/**
 * FormField
 *
 * @fileoverview Single form row with label, input, optional help text, and
 * optional error. Handles `input`, `textarea`, and `select` via the `as` prop.
 * Exposes the native input via `inputProps` so callers retain full control
 * over value, onChange, type, etc.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Automatic label ↔ input association via useId
 * - aria-invalid and aria-describedby wiring for help/error
 * - Required-asterisk rendered by CSS
 *
 * Dependencies: React only
 *
 * Accessibility:
 * - Associates label, help, and error with the input
 * - Error text uses role="alert" so screen readers announce changes
 */

import React, { useId } from 'react';

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {'input'|'textarea'|'select'} [props.as='input']
 * @param {string} [props.help]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {Object} [props.inputProps] - Spread onto the underlying element
 * @param {React.ReactNode} [props.children] - Options when as='select'
 * @returns {JSX.Element}
 */
function FormField({ label, as = 'input', help, error, required, inputProps = {}, children }) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const commonProps = {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    required: required || undefined,
    ...inputProps,
  };

  let field;
  if (as === 'textarea') {
    field = <textarea className="form-field-textarea" {...commonProps} />;
  } else if (as === 'select') {
    field = <select className="form-field-select" {...commonProps}>{children}</select>;
  } else {
    field = <input className="form-field-input" {...commonProps} />;
  }

  return (
    <div className={`form-field${error ? ' form-field--invalid' : ''}`}>
      <label
        htmlFor={id}
        className={`form-field-label${required ? ' form-field-label--required' : ''}`}
      >
        {label}
      </label>
      {field}
      {help && !error && <div id={helpId} className="form-field-help">{help}</div>}
      {error && <div id={errorId} className="form-field-error" role="alert">{error}</div>}
    </div>
  );
}

export default FormField;
