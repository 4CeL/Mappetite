"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t, tError } = useI18n();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [state, setState] = useState({ status: "idle", error: null });
  const ids = { email: useId(), password: useId(), error: useId() };

  const onSubmit = async (event) => {
    event.preventDefault();
    setState({ status: "loading", error: null });
    try {
      signIn(await api.login({ email: form.email.trim(), password: form.password }));
    } catch (error) {
      setState({ status: "error", error });
    }
  };

  const loading = state.status === "loading";

  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href="/register/" className="font-bold text-primary-800 underline underline-offset-2">
            {t("auth.registerLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {state.error ? (
          <div id={ids.error} className="alert alert-error" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{tError(state.error)}</p>
          </div>
        ) : null}
        <div>
          <label htmlFor={ids.email} className="field-label">
            {t("auth.email")}
          </label>
          <input
            id={ids.email}
            type="email"
            className="input"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby={state.error ? ids.error : undefined}
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="field-label">
            {t("auth.password")}
          </label>
          <PasswordInput
            id={ids.password}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn-primary mt-2 min-h-12" disabled={loading || !form.email || !form.password}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t("auth.login")}
        </button>
      </form>
      <GoogleButton onError={(error) => setState({ status: "error", error })} />
    </AuthLayout>
  );
}
