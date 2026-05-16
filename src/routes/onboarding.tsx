import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <AuthGate>
      <Onboarding />
    </AuthGate>
  ),
});

const schema = z.object({
  display_name: z.string().trim().min(2, "Name zu kurz").max(80),
  location: z.string().trim().max(80).optional().or(z.literal("")),
  role: z.enum(["tech", "business", "product", "design", "other"]),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  stage: z.enum(["idea", "mvp", "revenue", "scaling"]),
  commitment: z.enum(["full_time", "part_time", "exploring"]),
  skills: z.string().trim().max(200).optional().or(z.literal("")),
  vision: z.string().trim().min(20, "Mindestens 20 Zeichen").max(1000),
  looking_for: z.string().trim().min(20, "Mindestens 20 Zeichen").max(1000),
  photo_url: z.string().url().max(500).optional().or(z.literal("")),
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    location: "",
    role: "" as any,
    industry: "",
    stage: "" as any,
    commitment: "" as any,
    skills: "",
    vision: "",
    looking_for: "",
    photo_url: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            display_name: data.display_name ?? "",
            location: data.location ?? "",
            role: (data.role as any) ?? "",
            industry: data.industry ?? "",
            stage: (data.stage as any) ?? "",
            commitment: (data.commitment as any) ?? "",
            skills: (data.skills ?? []).join(", "),
            vision: data.vision ?? "",
            looking_for: data.looking_for ?? "",
            photo_url: data.photo_url ?? "",
          });
        }
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const skills = parsed.data.skills
      ? parsed.data.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        location: parsed.data.location || null,
        role: parsed.data.role,
        industry: parsed.data.industry || null,
        stage: parsed.data.stage,
        commitment: parsed.data.commitment,
        skills,
        vision: parsed.data.vision,
        looking_for: parsed.data.looking_for,
        photo_url: parsed.data.photo_url || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user!.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert.");
    navigate({ to: "/discover" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="eyebrow" style={{ color: "rgba(251,250,247,0.6)" }}>
        Setup · Schritt 1 von 1
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--cream)]">
        Dein{" "}
        <span className="font-serif italic font-normal">Founder-Profil</span>
      </h1>
      <p className="mt-3 text-sm" style={{ color: "rgba(251,250,247,0.7)" }}>
        Echt sein lohnt sich. Andere Gründer:innen sehen genau das hier.
      </p>

      <div
        className="glass-pane mt-10 p-7"
        style={{ background: "rgba(251,250,247,0.82)" }}
      >
        <form onSubmit={submit} className="space-y-5">
          <Field label="Name">
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Vor- und Nachname" />
          </Field>
          <Field label="Foto-URL (optional)">
            <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Standort (optional)">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Berlin, Remote, …" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Deine Rolle">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="other">Andere</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage">
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as any })}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idee</SelectItem>
                  <SelectItem value="mvp">MVP</SelectItem>
                  <SelectItem value="revenue">Umsatz</SelectItem>
                  <SelectItem value="scaling">Skalierung</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Commitment">
              <Select value={form.commitment} onValueChange={(v) => setForm({ ...form, commitment: v as any })}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Vollzeit</SelectItem>
                  <SelectItem value="part_time">Teilzeit</SelectItem>
                  <SelectItem value="exploring">Sondiere</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branche (optional)">
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Fintech, B2B SaaS, …" />
            </Field>
          </div>

          <Field label="Skills (Komma-getrennt)">
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Sales, Pitching" />
          </Field>

          <Field label="Was baust du? Was ist die Vision?">
            <Textarea rows={4} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
          </Field>

          <Field label="Was suchst du in einem Co-Founder?">
            <Textarea rows={4} value={form.looking_for} onChange={(e) => setForm({ ...form, looking_for: e.target.value })} />
          </Field>

          <Button type="submit" className="shadow-ember h-11 w-full rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]" disabled={loading}>
            {loading ? "Speichere…" : "Profil speichern"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
