"use client";

/** Labelled text input with a leading icon, used by the login and register forms. */
export default function AuthField({ id, label, icon: Icon, hint, hintId, className = "", ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 size-[1.05rem] -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <input id={id} className={`input min-h-12 pl-11 ${className}`} aria-describedby={hint ? hintId : undefined} {...inputProps} />
      </div>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
