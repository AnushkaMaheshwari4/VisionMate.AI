import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Mic, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VisionMate AI — Your Eyes, Powered by AI" },
      { name: "description", content: "AI-powered vision assistant for blind and low-vision users. Describe scenes, read documents, chat by voice, and stay safe." },
      { property: "og:title", content: "VisionMate AI" },
      { property: "og:description", content: "AI-powered vision assistant for blind and low-vision users." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Eye; title: string; body: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 transition hover:scale-[1.02]">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-primary-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VisionMate AI" width={40} height={40} className="rounded-lg" />
          <span className="text-lg font-bold text-foreground">VisionMate AI</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-4 pt-12 pb-20 text-center md:pt-20 md:pb-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Built for accessibility-first AI
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Your eyes, <span className="gradient-text">powered by AI.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            VisionMate AI helps blind and low-vision users understand the world. Describe any scene, read any
            document, chat by voice, and access emergency support — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/auth">
                Get started free <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <a href="#features">Learn more</a>
            </Button>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 pb-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={Eye} title="AI Scene Narrator" body="Upload any photo. Get a clear description, detected objects, people, text, and hazard warnings." />
            <FeatureCard icon={FileText} title="Smart Document Reader" body="Extract text from images and documents, hear a summary, and save them to revisit later." />
            <FeatureCard icon={Mic} title="Voice AI Assistant" body="Talk to VisionMate in English or Hindi. Ask about your scenes, documents, or anything else." />
            <FeatureCard icon={ShieldAlert} title="Emergency SOS" body="Keep trusted contacts one tap away. Log emergencies, place calls, send SMS in seconds." />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VisionMate AI. Built with care for accessibility.
      </footer>
    </div>
  );
}
