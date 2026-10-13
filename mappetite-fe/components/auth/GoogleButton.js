"use client";

import { GoogleLogin } from "@react-oauth/google";

import { useAuth } from "@/components/providers/AuthProvider";
import { api, ApiError } from "@/lib/api";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

function GoogleLoginButton({ onError }) {
  const { signIn } = useAuth();
  const { t, lang } = useI18n();

  const onSuccess = async ({ credential }) => {
    try {
      signIn(await api.loginWithGoogle({ credential, preferred_language: lang }));
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
        <span className="h-px flex-1 bg-line" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => onError?.(new ApiError(0, "auth.google_invalid"))}
          text="continue_with"
          shape="pill"
          locale={lang}
          width="320"
        />
      </div>
    </div>
  );
}

/** Rendered only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured. */
export default function GoogleButton(props) {
  return GOOGLE_CLIENT_ID ? <GoogleLoginButton {...props} /> : null;
}
