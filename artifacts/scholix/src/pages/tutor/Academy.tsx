import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Search, ChevronRight, GraduationCap, TrendingUp, DollarSign, Users, Zap, FileText } from "lucide-react";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  type: string;
  videoUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
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

function CategoryIcon({ category, size = 15 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[category] ?? BookOpen;
  return <Icon size={size} />;
}

function ArticleCard({ article }: { article: Article }) {
  const colorCls = CATEGORY_COLORS[article.category] ?? "bg-muted text-muted-foreground";
  return (
    <Link href={`/tutor/academy/${article.id}`}>
      <div className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
            <CategoryIcon category={article.category} size={13} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{article.category}</span>
          {article.type === "video" && (
            <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Video</span>
          )}
        </div>
        <h3 className="text-sm font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">{article.summary}</p>
        <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-primary">
          Read article <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  );
}

const ALL_CATEGORIES = [
  "ABN Basics", "Tax Responsibilities", "GST Explained", "Superannuation Basics",
  "Setting Aside Tax", "Pricing Strategy", "Professional Tutoring Tips",
  "Business Growth", "Student Acquisition", "Teaching Methods",
];

export default function TutorAcademy() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useState(() => {
    fetch("/api/academy", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => { setArticles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase());
      const matchesCat = !activeCategory || a.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [articles, search, activeCategory]);

  const recommended = useMemo(() => articles.slice(0, 3), [articles]);
  const categoriesWithContent = useMemo(() => [...new Set(articles.map((a) => a.category))], [articles]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Scholix Academy</h1>
        </div>
        <p className="text-sm text-muted-foreground">Learn how to grow your tutoring income, manage your business, and deliver exceptional sessions.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!activeCategory ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          All
        </button>
        {(search ? ALL_CATEGORIES : categoriesWithContent).map((cat) => {
          const colorCls = CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${activeCategory === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Recommended — show only when no filters */}
      {!search && !activeCategory && recommended.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recommended for you</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {recommended.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      {/* Main listing */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-foreground">No articles found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search term or category</p>
        </div>
      ) : (
        <div>
          {(search || activeCategory) && (
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}{activeCategory ? ` in ${activeCategory}` : ""}
            </h2>
          )}
          {!search && !activeCategory && <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">All articles</h2>}
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-10 p-4 bg-muted/50 rounded-xl border border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Scholix Academy provides educational content for general business and tutoring guidance only. This does not constitute financial, tax, or legal advice. Tutors are responsible for their own compliance obligations. Always consult a qualified professional for advice specific to your situation.
        </p>
      </div>
    </div>
  );
}
