import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { initials } from "@/utils/format";
import {
  LayoutDashboard, Users, Calendar, ListChecks, Sprout,
  Heart, Award, BarChart3, Settings, LogOut, Menu, UsersRound,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/app", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/disciples", icon: Users, label: "Disciples" },
  { to: "/app/groups", icon: UsersRound, label: "Groups" },
  { to: "/app/meetings", icon: Calendar, label: "Meetings" },
  { to: "/app/follow-ups", icon: ListChecks, label: "Follow-ups" },
  { to: "/app/habits", icon: Sprout, label: "Habits" },
  { to: "/app/prayer", icon: Heart, label: "Prayer" },
  { to: "/app/milestones", icon: Award, label: "Milestones" },
  { to: "/app/reports", icon: BarChart3, label: "Reports", roles: ["admin","pastor","viewer"] as const },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { user, roles, signOut, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="font-display text-2xl font-semibold text-sidebar-primary">Sōma</h1>
        <p className="text-xs text-muted-foreground mt-1 italic">a discipleship companion</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.filter(n => !n.roles || hasAnyRole([...n.roles])).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-soft"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials(user?.user_metadata?.display_name ?? user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.display_name ?? user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">{roles.join(", ") || "disciple"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => { await signOut(); navigate("/auth"); }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <h1 className="font-display text-xl font-semibold text-primary">Sōma</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent onNav={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
