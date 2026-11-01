import { Link } from "wouter";
import { UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function AccountNavigation() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <span className="text-sm">Loading account…</span>;
  if (!user) return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/login" className="hover:underline">Sign in</Link>
      <Link href="/signup" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">Get started</Link>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link href="/profile/me" className="inline-flex items-center gap-1.5 hover:underline" title={`${user.firstName} ${user.lastName}`}>
        <UserCircle size={22} aria-hidden="true" /> <span className="max-w-28 truncate">{user.firstName}</span>
      </Link>
      <Link href={`/${user.role}/dashboard`} className="rounded-lg bg-primary px-3 py-2 font-semibold text-white">
        Dashboard
      </Link>
    </div>
  );
}

export function PublicNavigation() {
  return (
    <header className="border-b bg-background text-foreground">
      <nav aria-label="Site navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="font-bold">Scholix home</Link>
          <Link href="/about">About</Link>
          <Link href="/tutors">Find tutors</Link>
        </div>
        <AccountNavigation />
      </nav>
    </header>
  );
}
