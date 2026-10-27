"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { useI18n } from "@/lib/i18n";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Escape closes, focus moves inside and returns afterwards,
 * Tab is kept inside. `variant="sheet"` slides up from the bottom on mobile.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = "md", variant = "dialog" }) {
  const { t } = useI18n();
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      } else if (event.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };
  const sheet = variant === "sheet";

  return (
    <div className={`fixed inset-0 z-[1200] flex justify-center ${sheet ? "items-end sm:items-center" : "items-center"} p-0 sm:p-6`}>
      <div className="absolute inset-0 bg-ink-900/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[100dvh] w-full flex-col bg-white shadow-pop focus:outline-none ${widths[size]} ${
          sheet ? "max-h-[90dvh] rounded-t-3xl sm:rounded-3xl" : "h-full sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5 sm:px-8 sm:pt-7">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-[13px] text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="icon-btn size-9 shrink-0 bg-chip shadow-none" aria-label={t("common.close")}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-6 py-5 sm:px-8">{children}</div>
        {footer ? <div className="border-t border-line px-6 py-4 sm:px-8">{footer}</div> : null}
      </div>
    </div>
  );
}
