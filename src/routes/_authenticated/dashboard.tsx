import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Mic, ShieldAlert, Sparkles, ArrowRight, Clock, Image as ImgIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — VisionMate AI" }] }),
  component: Dashboard,
});

type Stats = {
  analyses: number;
  documents: number;
  conversations: number;
  contacts: number;
};
type RecentAnalysis = { id: string; title: string | null; short_description: string | null; image_url: string; created_at: string };
type RecentDoc = { id: string; title: string; summary: string | null; created_at: string };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ analyses: 0, documents: 0, conversations: 0, contacts: 0 });
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [a, d, c, e, prof, recentA, recentD] = await Promise.all([
        supabase.from("image_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("voice_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("emergency_contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("image_analyses").select("id,title,short_description,image_url,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("documents").select("id,title,summary,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setStats({
        analyses: a.count ?? 0,
        documents: d.count ?? 0,
        conversations: c.count ?? 0,
        contacts: e.count ?? 0,
      });
      setRecent(recentA.data ?? []);
      setRecentDocs(recentD.data ?? []);
      setFullName(prof.data?.full_name ?? user.email?.split("@")[0] ?? "");
    })();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome */}
      <section className="mb-8 rounded-3xl gradient-bg p-8 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <Sparkles className="h-4 w-4" aria-hidden /> Welcome back
        </div>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold">Hi {fullName || "there"} 👋</h1>
        <p className="mt-2 max-w-2xl opacity-90">Your AI vision companion is ready. Describe a scene, read a document, or chat by voice.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="lg" className="h-12">
            <Link to="/narrator"><Eye className="mr-2 h-5 w-5" aria-hidden /> Analyze an image</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">
            <Link to="/voice"><Mic className="mr-2 h-5 w-5" aria-hidden /> Ask the assistant</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard label="Image analyses" value={stats.analyses} icon={Eye} />
        <StatCard label="Documents" value={stats.documents} icon={FileText} />
        <StatCard label="Conversations" value={stats.conversations} icon={Mic} />
        <StatCard label="Emergency contacts" value={stats.contacts} icon={ShieldAlert} />
      </section>

      {/* Quick actions + recent */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent scene analyses</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/narrator">View all <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={ImgIcon} title="No analyses yet" body="Upload your first photo to get started." cta={<Button asChild><Link to="/narrator">Start now</Link></Button>} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link to="/narrator" className="block group rounded-xl overflow-hidden border border-border hover:border-primary transition">
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img src={a.image_url} alt={a.title ?? "Scene"} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium truncate">{a.title ?? "Scene"}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.short_description}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent documents</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/documents">View all <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Link>
            </Button>
          </div>
          {recentDocs.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" body="Upload a photo of any document to read it aloud." cta={<Button asChild variant="outline"><Link to="/documents">Upload</Link></Button>} />
          ) : (
            <ul className="space-y-3">
              {recentDocs.map((d) => (
                <li key={d.id}>
                  <Link to="/documents" className="block rounded-lg p-3 hover:bg-accent transition">
                    <p className="font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Eye }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, body, cta }: { icon: typeof Eye; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
