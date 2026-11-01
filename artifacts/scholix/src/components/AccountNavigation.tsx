import { Link } from "wouter";
import { UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Brand";

export function AccountNavigation() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <span className="text-sm opacity-70">Loading account…</span>;
  if (!user) return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/login" className="hover:underline">Sign in</Link>
      <Link href="/signup" className="rounded-full bg-brand-teal px-4 py-2 font-semibold text-brand-cream hover:bg-[#0b7559] transition-colors">Get started</Link>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link href="/profile/me" className="inline-flex items-center gap-1.5 hover:underline" title={`${user.firstName} ${user.lastName}`}>
        <UserCircle size={22} aria-hidden="true" /> <span className="max-w-28 truncate">{user.firstName}</span>
      </Link>
      <Link href={`/${user.role}/dashboard`} className="rounded-full bg-brand-teal px-4 py-2 font-semibold text-brand-cream hover:bg-[#0b7559] transition-colors">
        Dashboard
      </Link>
    </div>
  );
}

export function PublicNavigation() {
  return (
    <header className="border-b border-border bg-brand-cream/95 backdrop-blur text-brand-navy sticky top-0 z-40">
      <nav aria-label="Site navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" aria-label="Scholix home"><Brand size={30} /></Link>
          <Link href="/about" className="hover:text-brand-teal transition-colors">About</Link>
          <Link href="/tutors" className="hover:text-brand-teal transition-colors">Find tutors</Link>
        </div>
        <AccountNavigation />
      </nav>
    </header>
  );
}
