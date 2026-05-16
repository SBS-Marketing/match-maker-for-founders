import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  ),
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!profile) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Lade…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dein Profil</h1>
        <Link to="/onboarding"><Button variant="outline" size="sm">Bearbeiten</Button></Link>
      </div>
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profile.photo_url && <AvatarImage src={profile.photo_url} />}
            <AvatarFallback>{(profile.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xl font-semibold">{profile.display_name ?? "Ohne Namen"}</div>
            <div className="text-sm text-muted-foreground">{profile.location ?? user?.email}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.role && <Badge variant="secondary">{profile.role}</Badge>}
          {profile.stage && <Badge variant="secondary">{profile.stage}</Badge>}
          {profile.commitment && <Badge variant="secondary">{profile.commitment}</Badge>}
          {profile.industry && <Badge variant="outline">{profile.industry}</Badge>}
        </div>
        {profile.vision && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Vision</h3>
            <p className="mt-2 text-sm">{profile.vision}</p>
          </div>
        )}
        {profile.looking_for && (
          <div className="mt-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Sucht</h3>
            <p className="mt-2 text-sm">{profile.looking_for}</p>
          </div>
        )}
        {!profile.onboarded_at && (
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
            Dein Profil ist noch nicht vollständig. <Link to="/onboarding" className="underline">Jetzt vervollständigen.</Link>
          </div>
        )}
      </Card>
    </div>
  );
}
