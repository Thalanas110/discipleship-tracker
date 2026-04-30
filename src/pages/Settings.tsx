import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { profileService } from "@/integrations/supabase/services/profileService";
import type { Profile } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, roles } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Settings · Sōma";
    if (!user) return;
    (async () => {
      try {
        const p = await profileService.getById(user.id);
        setProfile(p);
        setDisplayName(p?.display_name ?? "");
        setPhone(p?.phone ?? "");
        setBio(p?.bio ?? "");
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await profileService.update({ display_name: displayName, phone, bio });
      toast.success("Profile saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and account." />
      <Card className="p-6 max-w-xl space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <p className="text-sm mt-1">{profile?.email ?? user?.email}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Roles</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {roles.length === 0 ? <span className="text-sm text-muted-foreground">none</span> :
              roles.map((r) => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>)}
          </div>
        </div>
        <div className="space-y-1.5"><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A bit about you and your journey..." /></div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save changes</Button>
      </Card>
    </>
  );
}
