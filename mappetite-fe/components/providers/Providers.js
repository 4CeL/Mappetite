"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "./AuthProvider";
import { PlacesProvider } from "./PlacesProvider";

export default function Providers({ children }) {
  const tree = (
    <LanguageProvider>
      <AuthProvider>
        <PlacesProvider>{children}</PlacesProvider>
      </AuthProvider>
    </LanguageProvider>
  );

  // Google sign-in is optional: without a client ID the button is simply hidden.
  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider> : tree;
}
