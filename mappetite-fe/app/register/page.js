"use client";

import { AlertTriangle, ArrowRight, AtSign, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import AuthField from "@/components/auth/AuthField";
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
      eyebrow={t("auth.joinUs")}
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/login/" className="font-bold text-primary-800 underline underline-offset-2 hover:text-primary-900">
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
        <AuthField
          id={ids.username}
          label={t("auth.username")}
          icon={AtSign}
          value={form.username}
          onChange={set("username")}
          placeholder={t("auth.usernamePlaceholder")}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={30}
          required
          hint={t("auth.usernameHint")}
          hintId={`${ids.username}-hint`}
        />
        <AuthField
          id={ids.email}
          label={t("auth.email")}
          icon={Mail}
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
          inputMode="email"
          required
        />
        <div>
          <label htmlFor={ids.password} className="field-label">
            {t("auth.password")}
          </label>
          <PasswordInput
            id={ids.password}
            value={form.password}
            onChange={set("password")}
            placeholder={t("auth.passwordNewPlaceholder")}
            autoComplete="new-password"
            describedBy={`${ids.password}-hint`}
          />
          <p id={`${ids.password}-hint`} className="field-hint">
            {t("auth.passwordHint")}
          </p>
        </div>
        <button
          type="submit"
          className="btn btn-primary group mt-2 min-h-12 text-[15px] shadow-card"
          disabled={loading || !form.username || !form.email || !form.password}
        >
          {t("auth.register")}
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          )}
        </button>
      </form>
      <GoogleButton onError={(error) => setState({ status: "error", error })} />
    </AuthLayout>
  );
}
