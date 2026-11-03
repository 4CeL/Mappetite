"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

export default function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid, placeholder }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock
        className="pointer-events-none absolute left-4 top-1/2 size-[1.05rem] -translate-y-1/2 text-ink-500"
        aria-hidden="true"
      />
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="input min-h-12 pl-11 pr-12"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 hover:text-ink-900"
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
