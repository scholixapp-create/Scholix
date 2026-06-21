import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle, X, Save } from "lucide-react";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

interface Article {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  type: string;
  videoUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
}

const CATEGORIES = [
  "ABN Basics", "Tax Responsibilities", "GST Explained", "Superannuation Basics",
  "Setting Aside Tax", "Pricing Strategy", "Professional Tutoring Tips",
  "Business Growth", "Student Acquisition", "Teaching Methods",
];

const EMPTY_FORM = {
  title: "",
  category: CATEGORIES[0],
  summary: "",
  content: "",
  type: "article",
  videoUrl: "",
  isPublished: false,
};

type FormState = typeof EMPTY_FORM;

export default function AdminAcademy() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = () => {
    fetch("/api/admin/academy", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => { setArticles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleEdit = (a: Article) => {
    setForm({
      title: a.title,
      category: a.category,
      summary: a.summary,
      content: a.content,
      type: a.type,
      videoUrl: a.videoUrl ?? "",
      isPublished: a.isPublished,
    });
    setEditingId(a.id);
    setShowForm(true);
    setError("");
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.summary.trim() || !form.content.trim()) {
      setError("Title, summary and content are required.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const url = editingId ? `/api/admin/academy/${editingId}` : "/api/admin/academy";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, videoUrl: form.videoUrl || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setShowForm(false);
      setEditingId(null);
      load();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (a: Article) => {
    await fetch(`/api/admin/academy/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isPublished: !a.isPublished }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/academy/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setDeleteConfirm(null);
    load();
  };

  const published = articles.filter((a) => a.isPublished).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Academy CMS</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{articles.length} articles · {published} published</p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus size={15} /> New article
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">{editingId ? "Edit article" : "New article"}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Do I Need an ABN as a Tutor?"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="mixed">Article + Video</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Summary * <span className="font-normal">(shown in listing)</span></label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))}
                rows={2}
                placeholder="One or two sentences describing the article…"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Content * <span className="font-normal">(supports markdown: ## Heading, **bold**, - bullet)</span></label>
              <textarea
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                rows={14}
                placeholder="## Section heading&#10;&#10;Your content here...&#10;&#10;- Bullet point one&#10;- Bullet point two"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-y"
              />
            </div>
            {(form.type === "video" || form.type === "mixed") && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Video URL <span className="font-normal">(YouTube/Vimeo embed URL)</span></label>
                <input
                  value={form.videoUrl}
                  onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublished ? "bg-accent" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.isPublished ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-xs font-medium text-foreground">{form.isPublished ? "Published" : "Draft"}</span>
            </label>

            <div className="flex items-center gap-2">
              {error && <span className="text-xs text-destructive">{error}</span>}
              {saved && <span className="flex items-center gap-1 text-xs text-accent font-medium"><CheckCircle size={12} /> Saved</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Articles list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
          <p className="text-sm font-semibold text-foreground">No articles yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New article" to create your first Academy article.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.isPublished ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                    {a.isPublished ? "Published" : "Draft"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{a.category}</span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.summary}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTogglePublish(a)}
                  title={a.isPublished ? "Unpublish" : "Publish"}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {a.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => handleEdit(a)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(a.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Delete article?</h2>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
