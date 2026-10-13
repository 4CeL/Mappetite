"use client";

import { AlertTriangle, Check, Loader2, LogOut, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import LanguageToggle from "@/components/LanguageToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api, ApiError } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { updateSessionUser } from "@/lib/session";

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

function ProfileSection() {
  const { t, tError } = useI18n();
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [state, setState] = useState({ status: "idle", error: null });
  const ids = { username: useId(), email: useId() };

  const onSubmit = async (event) => {
    event.preventDefault();
    const next = username.trim();
    if (!USERNAME_RE.test(next)) {
      setState({ status: "error", error: new ApiError(400, "auth.username_invalid") });
      return;
    }
    setState({ status: "saving", error: null });
    try {
      updateSessionUser(await api.updateMe({ username: next }));
      setState({ status: "saved", error: null });
    } catch (error) {
      setState({ status: "error", error });
    }
  };

  return (
    <section className="card p-6" aria-labelledby="account-title">
      <h2 id="account-title" className="text-base font-bold text-ink-900">
        {t("settings.account")}
      </h2>
      <p className="mt-1 text-xs text-ink-500">
        {t("settings.signedInWith", {
          provider: user?.auth_provider === "google" ? t("settings.providerGoogle") : t("settings.providerLocal"),
        })}
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor={ids.email} className="field-label">
            {t("auth.email")}
          </label>
          <input id={ids.email} className="input bg-chip" value={user?.email ?? ""} readOnly />
        </div>
        <div>
          <label htmlFor={ids.username} className="field-label">
            {t("auth.username")}
          </label>
          <div className="flex gap-2">
            <input
              id={ids.username}
              className="input"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setState({ status: "idle", error: null });
              }}
              maxLength={30}
              autoCapitalize="off"
              aria-describedby={`${ids.username}-hint`}
            />
            <button
              type="submit"
              className="btn btn-primary shrink-0"
              disabled={state.status === "saving" || username.trim() === user?.username}
            >
              {state.status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {t("settings.saveProfile")}
            </button>
          </div>
          <p id={`${ids.username}-hint`} className="field-hint">
            {t("auth.usernameHint")}
          </p>
        </div>
        <div aria-live="polite">
          {state.status === "saved" ? (
            <p className="alert alert-success">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("settings.profileSaved")}
            </p>
          ) : null}
          {state.status === "error" ? (
            <p className="alert alert-error" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {tError(state.error)}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function TagRow({ tag, onRenamed, onDeleted, onError }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  const rename = async (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || name === tag.name) {
      setDraft(null);
      return;
    }
    setBusy(true);
    try {
      onRenamed(await api.renameTag(tag.id, name));
      setDraft(null);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("settings.deleteTagConfirm", { name: tag.name }))) return;
    setBusy(true);
    try {
      await api.deleteTag(tag.id);
      onDeleted(tag.id);
    } catch (error) {
      onError(error);
      setBusy(false);
    }
  };

  if (draft !== null) {
    return (
      <li>
        <form onSubmit={rename} className="flex items-center gap-2 py-2">
          <label htmlFor={inputId} className="sr-only">
            {t("settings.rename")}
          </label>
          <input
            id={inputId}
            className="input min-h-10"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={LIMITS.tag}
            autoFocus
          />
          <button type="submit" className="icon-btn size-10 shadow-none" disabled={busy} aria-label={t("common.save")}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" className="icon-btn size-10 shadow-none" onClick={() => setDraft(null)} aria-label={t("common.cancel")}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink-900">{tag.name}</span>
        <span className="text-xs text-ink-500">{t("settings.tagUsage", { count: tag.usage_count })}</span>
      </span>
      <span className="flex shrink-0 gap-1">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-ink-600 hover:bg-chip"
          onClick={() => setDraft(tag.name)}
          aria-label={`${t("settings.rename")}: ${tag.name}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-danger-700 hover:bg-danger-50"
          onClick={remove}
          disabled={busy}
          aria-label={`${t("common.delete")}: ${tag.name}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}

function TagsSection() {
  const { t, tError } = useI18n();
  const { reload } = usePlaces();
  const [state, setState] = useState({ status: "loading", tags: [], error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listTags(controller.signal)
      .then((tags) => setState({ status: "ready", tags: tags ?? [], error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error", tags: [], error });
      });
    return () => controller.abort();
  }, []);

  const onRenamed = (tag) => {
    setState((previous) => ({
      ...previous,
      error: null,
      tags: previous.tags.map((item) => (item.id === tag.id ? { ...item, name: tag.name } : item)),
    }));
    reload();
  };
  const onDeleted = (id) => {
    setState((previous) => ({ ...previous, error: null, tags: previous.tags.filter((item) => item.id !== id) }));
    reload();
  };
  const onError = (error) => setState((previous) => ({ ...previous, error }));

  return (
    <section className="card p-6" aria-labelledby="tags-title">
      <h2 id="tags-title" className="text-base font-bold text-ink-900">
        {t("settings.tags")}
      </h2>
      <p className="mt-1 text-xs text-ink-500">{t("settings.tagsHint")}</p>
      {state.error ? (
        <p className="alert alert-error mt-4" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {tError(state.error)}
        </p>
      ) : null}
      {state.status === "loading" ? (
        <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      ) : state.tags.length === 0 && state.status === "ready" ? (
        <p className="mt-4 text-sm text-ink-500">{t("settings.noTags")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {state.tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onRenamed={onRenamed} onDeleted={onDeleted} onError={onError} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-8 pt-6 lg:px-6 lg:pt-10">
      <h1 className="text-[22px] font-bold text-ink-900 lg:text-[26px]">{t("settings.title")}</h1>
      <ProfileSection />
      <section className="card flex items-center justify-between gap-4 p-6" aria-labelledby="language-title">
        <h2 id="language-title" className="text-base font-bold text-ink-900">
          {t("settings.language")}
        </h2>
        <LanguageToggle />
      </section>
      <TagsSection />
      <button type="button" onClick={signOut} className="btn btn-outline self-start text-danger-700">
        <LogOut className="size-4" aria-hidden="true" />
        {t("auth.logout")}
      </button>
    </div>
  );
}
