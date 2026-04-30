import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Sprout, Heart, Users, Calendar } from "lucide-react";

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Sōma</h1>
          <p className="text-xs text-muted-foreground italic">a discipleship companion</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button asChild className="shadow-warm"><Link to="/auth?mode=register">Get started</Link></Button>
        </div>
      </header>

      <section className="px-6 lg:px-12 pt-12 lg:pt-24 pb-20 max-w-5xl mx-auto">
        <div className="max-w-3xl">
          <p className="text-accent font-medium text-sm uppercase tracking-widest mb-4">For pastors, leaders, and disciples</p>
          <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground leading-[1.05] tracking-tight">
            Discipleship is about <em className="text-accent not-italic">people</em>, not streaks.
          </h2>
          <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
            Sōma helps churches walk alongside disciples — tracking meetings, follow-ups, prayer,
            and growth stages. Habits support the journey. They don't define it.
          </p>
          <div className="flex flex-wrap gap-3 mt-10">
            <Button size="lg" asChild className="shadow-warm">
              <Link to="/auth?mode=register">Start your ministry</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {[
            { icon: Users, title: "Relationships first", body: "Mentor–disciple pairs are at the heart of the model." },
            { icon: Calendar, title: "Meaningful meetings", body: "Capture summaries, spiritual notes, and next steps." },
            { icon: Heart, title: "Care alerts", body: "Know who needs follow-up before they fall through." },
            { icon: Sprout, title: "Stages of growth", body: "From new believer to multiplying — see the journey." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card/70 backdrop-blur rounded-lg p-5 border border-border shadow-soft">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-display text-lg font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 lg:px-12 py-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        "Habits support discipleship. They do not define it."
      </footer>
    </div>
  );
}
