import { Link, useLocation } from "wouter";
import { BookOpen, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <BookOpen size={28} className="text-primary" />
      </div>

      <p className="text-6xl font-black text-primary/20 mb-2 leading-none">404</p>
      <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
        We couldn't find the page you were looking for. It may have been moved or no longer exists.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(-1 as unknown as string)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={15} />
          Go back
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Home size={15} />
          Home
        </Link>
      </div>
    </div>
  );
}
