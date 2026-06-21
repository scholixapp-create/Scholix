import { useState, useEffect, type ElementType } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, BookOpen, Clock, GraduationCap, DollarSign, TrendingUp, Users, Zap, FileText } from "lucide-react";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  type: string;
  videoUrl?: string | null;
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, ElementType> = {
  "ABN Basics": FileText,
  "Tax Responsibilities": DollarSign,
  "GST Explained": DollarSign,
  "Superannuation Basics": TrendingUp,
  "Setting Aside Tax": DollarSign,
  "Pricing Strategy": TrendingUp,
  "Professional Tutoring Tips": GraduationCap,
  "Business Growth": Zap,
  "Student Acquisition": Users,
  "Teaching Methods": BookOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  "ABN Basics": "bg-blue-100 text-blue-600",
  "Tax Responsibilities": "bg-orange-100 text-orange-600",
  "GST Explained": "bg-orange-100 text-orange-600",
  "Superannuation Basics": "bg-purple-100 text-purple-600",
  "Setting Aside Tax": "bg-amber-100 text-amber-600",
  "Pricing Strategy": "bg-emerald-100 text-emerald-600",
  "Professional Tutoring Tips": "bg-primary/10 text-primary",
  "Business Growth": "bg-violet-100 text-violet-600",
  "Student Acquisition": "bg-pink-100 text-pink-600",
  "Teaching Methods": "bg-cyan-100 text-cyan-600",
};

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-bold text-foreground mt-6 mb-2 first:mt-0">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-lg font-bold text-foreground mt-6 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed mb-1">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
        </li>
      );
    } else if (line.startsWith("| ")) {
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      const isHeader = cells.every(c => c !== "---");
      if (!cells.every(c => c === "---")) {
        elements.push(
          <div key={key++} className={`grid gap-2 py-2 border-b border-border ${isHeader ? "font-semibold text-foreground" : "text-sm text-muted-foreground"}`} style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
            {cells.map((c, i) => <span key={i} className="text-xs">{c}</span>)}
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-muted-foreground leading-relaxed mb-1"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground'>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
        />
      );
    }
  }
  return elements;
}

export default function AcademyArticle() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/academy/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data: Article) => {
        setArticle(data);
        return fetch("/api/academy", { headers: { Authorization: `Bearer ${getToken()}` } });
      })
      .then((r) => r.json())
      .then((all: Article[]) => {
        const others = all.filter((a) => String(a.id) !== id);
        setRelated(others.slice(0, 3));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground">Article not found.</p>
        <Link href="/tutor/academy" className="text-primary text-sm hover:underline mt-3 inline-block">← Back to Academy</Link>
      </div>
    );
  }

  const colorCls = CATEGORY_COLORS[article.category] ?? "bg-muted text-muted-foreground";
  const Icon = CATEGORY_ICONS[article.category] ?? BookOpen;
  const readMin = Math.max(1, Math.ceil(article.content.split(" ").length / 200));

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/tutor/academy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ArrowLeft size={14} /> Academy
      </Link>

      {/* Article header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorCls}`}>
            <Icon size={11} />
            {article.category}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} />
            {readMin} min read
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight mb-3">{article.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
      </div>

      {/* Optional video */}
      {article.videoUrl && (
        <div className="mb-5 rounded-2xl overflow-hidden border border-border aspect-video">
          <iframe
            src={article.videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={article.title}
          />
        </div>
      )}

      {/* Article content */}
      <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
        <div className="space-y-0.5">
          {renderContent(article.content)}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/50 rounded-xl border border-border p-4 mb-8">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Scholix Academy provides educational content for general business and tutoring guidance only. This does not constitute financial, tax, or legal advice. Tutors are responsible for their own compliance obligations. Always consult a qualified professional for advice specific to your situation.
        </p>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">More articles</h2>
          <div className="space-y-2">
            {related.map((a) => {
              const RIcon = CATEGORY_ICONS[a.category] ?? BookOpen;
              const rColor = CATEGORY_COLORS[a.category] ?? "bg-muted text-muted-foreground";
              return (
                <Link key={a.id} href={`/tutor/academy/${a.id}`}>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors group cursor-pointer">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rColor}`}>
                      <RIcon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.category}</p>
                    </div>
                    <ArrowLeft size={13} className="text-muted-foreground rotate-180 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
