import Link from "next/link";

import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-16" />
      <h1 className="mt-4 text-xl font-bold text-ink-900">404</h1>
      <p className="mt-1 text-sm text-ink-500">Halaman tidak ditemukan · Page not found</p>
      <Link href="/" className="btn btn-primary mt-5">
        Mappetite
      </Link>
    </div>
  );
}
