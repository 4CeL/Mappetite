"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Globe,
  Loader2,
  LogOut,
  Pencil,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopSearchBar from "@/components/layout/TopSearchBar";
import LanguageToggle from "@/components/LanguageToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { api, ApiError } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { updateSessionUser } from "@/lib/session";

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

/* ── Section Card Wrapper ─────────────────────────────────────────── */
function SectionCard({ icon: Icon, iconColor = "#485635", iconBg = "#E5EBDD", title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-[#ECE7DD] bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Section Header */}
      <div className="flex items-center gap-3.5 px-6 pt-6 pb-4">
        <span
          className="flex size-10 items-center justify-center rounded-xl shrink-0 shadow-xs"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="size-5" style={{ color: iconColor }} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink-900 leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      {/* Divider */}
      <div className="mx-6 border-t border-[#EAE5D9]" />
      {/* Content */}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/* ── Profile Section ─────────────────────────────────────────────── */
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

  const displayName = user?.username || "User";
  const providerLabel =
    user?.auth_provider === "google" ? t("settings.providerGoogle") : t("settings.providerLocal");

  return (
    <SectionCard
      icon={User}
      title={t("settings.account")}
      subtitle={t("settings.signedInWith", { provider: providerLabel })}
    >
      {/* Avatar + Name Banner */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-gradient-to-r from-[#E5EBDD]/70 to-[#F4F1EA]/50 border border-[#DDD9CC]">
        <div className="size-14 rounded-full bg-[#485635] text-white flex items-center justify-center text-xl font-bold uppercase shadow-md shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold text-ink-900 truncate">{displayName}</p>
          <p className="text-xs text-ink-500 truncate">{user?.email ?? ""}</p>
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-white/80 border border-[#E5E1D5] text-[10px] font-semibold text-ink-600">
            <Shield className="size-3 text-[#485635]" />
            {providerLabel}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {/* Email (readonly) */}
        <div>
          <label htmlFor={ids.email} className="block text-xs font-bold text-ink-700 mb-1.5">
            {t("auth.email")}
          </label>
          <input
            id={ids.email}
            className="w-full rounded-xl border border-[#E5E1D5] bg-[#F7F5F0] px-4 py-2.5 text-sm text-ink-500 cursor-not-allowed"
            value={user?.email ?? ""}
            readOnly
          />
        </div>

        {/* Username (editable) */}
        <div>
          <label htmlFor={ids.username} className="block text-xs font-bold text-ink-700 mb-1.5">
            {t("auth.username")}
          </label>
          <div className="flex gap-2">
            <input
              id={ids.username}
              className="flex-1 rounded-xl border border-[#E5E1D5] bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-[#485635] focus:ring-2 focus:ring-[#485635]/10 focus:outline-none transition-all"
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
              className="inline-flex items-center gap-2 shrink-0 rounded-xl bg-[#485635] hover:bg-[#3B472A] text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={state.status === "saving" || username.trim() === user?.username}
            >
              {state.status === "saving" && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {t("settings.saveProfile")}
            </button>
          </div>
          <p id={`${ids.username}-hint`} className="text-[11px] text-ink-400 mt-1.5">
            {t("auth.usernameHint")}
          </p>
        </div>

        {/* Feedback */}
        <div aria-live="polite">
          {state.status === "saved" && (
            <div className="flex items-center gap-2 rounded-xl bg-[#EDF4EB] border border-[#DCEDD9] px-4 py-3 text-xs font-semibold text-[#4E8746]">
              <Check className="size-4 shrink-0" aria-hidden="true" />
              {t("settings.profileSaved")}
            </div>
          )}
          {state.status === "error" && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-xs font-semibold text-danger-700" role="alert">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {tError(state.error)}
            </div>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

/* ── Language Section ─────────────────────────────────────────────── */
function LanguageSection() {
  const { t } = useI18n();
  return (
    <SectionCard
      icon={Globe}
      iconColor="#6B8DA6"
      iconBg="#E2EEF5"
      title={t("settings.language")}
      subtitle={t("settings.languageHint")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{t("settings.selectLanguage")}</p>
        <LanguageToggle />
      </div>
    </SectionCard>
  );
}

/* ── Tag Row ─────────────────────────────────────────────────────── */
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
      <li className="group">
        <form onSubmit={rename} className="flex items-center gap-2 py-2.5 px-1">
          <label htmlFor={inputId} className="sr-only">
            {t("settings.rename")}
          </label>
          <input
            id={inputId}
            className="flex-1 rounded-xl border border-[#E5E1D5] bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-[#485635] focus:ring-2 focus:ring-[#485635]/10 focus:outline-none transition-all"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={LIMITS.tag}
            autoFocus
          />
          <button
            type="submit"
            className="flex size-9 items-center justify-center rounded-xl bg-[#E5EBDD] text-[#485635] hover:bg-[#D8E2CE] transition-colors"
            disabled={busy}
            aria-label={t("common.save")}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl bg-[#F4F1EA] text-ink-500 hover:bg-[#E5E1D5] transition-colors"
            onClick={() => setDraft(null)}
            aria-label={t("common.cancel")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center justify-between gap-3 py-3 px-1 rounded-xl hover:bg-[#FAF8F3] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#F4F1EA] shrink-0">
          <Tag className="size-3.5 text-ink-500" />
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink-900">{tag.name}</span>
          <span className="text-[11px] text-ink-400">{t("settings.tagUsage", { count: tag.usage_count })}</span>
        </div>
      </div>
      <span className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-[#E5EBDD] hover:text-[#485635] transition-colors"
          onClick={() => setDraft(tag.name)}
          aria-label={`${t("settings.rename")}: ${tag.name}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 hover:text-danger-700 transition-colors"
          onClick={remove}
          disabled={busy}
          aria-label={`${t("common.delete")}: ${tag.name}`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}

/* ── Tags Section ────────────────────────────────────────────────── */
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
    <SectionCard
      icon={Tag}
      iconColor="#B5762A"
      iconBg="#FDF3E4"
      title={t("settings.tags")}
      subtitle={t("settings.tagsHint")}
    >
      {state.error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-xs font-semibold text-danger-700 mb-4" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {tError(state.error)}
        </div>
      )}

      {state.status === "loading" ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-12 rounded-xl bg-[#F4F1EA] animate-pulse" />
          ))}
        </div>
      ) : state.tags.length === 0 && state.status === "ready" ? (
        <div className="text-center py-8">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FDF3E4] mx-auto mb-3">
            <Sparkles className="size-6 text-[#B5762A]" />
          </div>
          <p className="text-sm font-semibold text-ink-700">{t("settings.noTags")}</p>
          <p className="text-xs text-ink-400 mt-1">{t("settings.noTagsHint")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#EAE5D9]">
          {state.tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onRenamed={onRenamed} onDeleted={onDeleted} onError={onError} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ── Danger Zone ─────────────────────────────────────────────────── */
function DangerZone() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <section className="rounded-2xl border border-danger-200/60 bg-danger-50/30 overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-danger-800">{t("settings.dangerZone")}</h2>
          <p className="text-[11.5px] text-danger-600/70 mt-0.5">{t("settings.dangerHint")}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 shrink-0 rounded-xl border border-danger-200 bg-white hover:bg-danger-50 text-danger-700 px-4 py-2.5 text-xs font-bold shadow-sm transition-all hover:shadow-md"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t("auth.logout")}
        </button>
      </div>
    </section>
  );
}

/* ── Main Settings Page ──────────────────────────────────────────── */
export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-ink-900 flex flex-col lg:flex-row">
      {/* Left Sidebar (consistent with map + list pages) */}
      <AppSidebar className="hidden lg:flex h-screen sticky top-0" />

      {/* Main Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <TopSearchBar
          searchQuery=""
          onSearchChange={() => {}}
          className="border-b border-[#EAE5D9]/70 bg-[#FAF8F3]/80 backdrop-blur-sm sticky top-0 z-[1050]"
        />

        {/* Content */}
        <div className="flex-1 px-4 sm:px-8 lg:px-10 py-6 lg:py-10 w-full">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs text-ink-400 font-medium mb-3">
              <span>{t("nav.map")}</span>
              <ChevronRight className="size-3" />
              <span className="text-ink-700">{t("settings.title")}</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink-900 tracking-tight">
              {t("settings.pageTitle")}
            </h1>
            <p className="text-sm text-ink-500 mt-1.5">{t("settings.pageSubtitle")}</p>
          </div>

          {/* Settings Sections */}
          <div className="flex flex-col gap-5 pb-10">
            <ProfileSection />
            <LanguageSection />
            <TagsSection />
            <DangerZone />
          </div>
        </div>
      </div>
    </div>
  );
}
