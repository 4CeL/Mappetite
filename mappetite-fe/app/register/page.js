"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, ApiError } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

export default function RegisterPage() {
  const { t, tError, lang } = useI18n();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [state, setState] = useState({ status: "idle", error: null });
  const ids = { username: useId(), email: useId(), password: useId(), error: useId() };

  const onSubmit = async (event) => {
    event.preventDefault();
    const username = form.username.trim();
    if (!USERNAME_RE.test(username)) {
      setState({ status: "error", error: new ApiError(400, "auth.username_invalid") });
      return;
    }
    if (form.password.length < LIMITS.passwordMin) {
      setState({ status: "error", error: new ApiError(400, "auth.password_too_short") });
      return;
    }
    setState({ status: "loading", error: null });
    try {
      signIn(
        await api.register({ username, email: form.email.trim(), password: form.password, preferred_language: lang }),
      );
    } catch (error) {
      setState({ status: "error", error });
    }
  };

  const loading = state.status === "loading";
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <AuthLayout
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/login/" className="font-bold text-primary-800 underline underline-offset-2">
            {t("auth.loginLink")}
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
          <label htmlFor={ids.username} className="field-label">
            {t("auth.username")}
          </label>
          <input
            id={ids.username}
            className="input"
            value={form.username}
            onChange={set("username")}
            autoComplete="username"
            autoCapitalize="off"
            maxLength={30}
            required
            aria-describedby={`${ids.username}-hint`}
          />
          <p id={`${ids.username}-hint`} className="field-hint">
            {t("auth.usernameHint")}
          </p>
        </div>
        <div>
          <label htmlFor={ids.email} className="field-label">
            {t("auth.email")}
          </label>
          <input
            id={ids.email}
            type="email"
            className="input"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="field-label">
            {t("auth.password")}
          </label>
          <PasswordInput
            id={ids.password}
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            describedBy={`${ids.password}-hint`}
          />
          <p id={`${ids.password}-hint`} className="field-hint">
            {t("auth.passwordHint")}
          </p>
        </div>
        <button
          type="submit"
          className="btn btn-primary mt-2 min-h-12"
          disabled={loading || !form.username || !form.email || !form.password}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t("auth.register")}
        </button>
      </form>
      <GoogleButton onError={(error) => setState({ status: "error", error })} />
    </AuthLayout>
  );
}
