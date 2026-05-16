# matchfoundr — Plan

Eine fokussierte Plattform, auf der Gründer:innen ihren ersten Co-Founder finden. Dunkles, reduziertes Design (Linear/Vercel-Stil), klare deutsche Copy.

## Umfang dieser Version

1. **Landing Page** (öffentlich)
   - Hero mit Headline „Finde den Co-Founder, den du wirklich brauchst."
   - Sektionen: Wie es funktioniert (3 Schritte), Manifest („kein Lebenslauf-Theater"), FAQ, Footer
   - CTA „Founder-Profil erstellen" → Signup

2. **Auth** (Lovable Cloud)
   - Email/Passwort + Google Sign-In
   - Auto-Login nach Signup, Session-Persistierung
   - Geschützte Routen via Auth-Guard

3. **Onboarding / Founder-Profil**
   - Mehrstufiges Formular: Name, Foto, Standort, Rolle (Tech/Business/Product/Design), Skills, Branche, Stage (Idee/MVP/Revenue), Commitment (Full-/Part-time), Vision (Freitext), was gesucht wird
   - Validierung mit zod

4. **Discover / Matching**
   - Karten-Stack: ein Profil pro Karte, „Interessiert" / „Weiter"
   - Filter: Rolle, Stage, Standort, Commitment
   - Match entsteht, wenn beide Seiten „Interessiert" klicken

5. **Matches & Chat (MVP)**
   - Liste aller Matches
   - 1:1 Chat pro Match (Realtime via Lovable Cloud)

6. **Eigenes Profil**
   - Anzeigen & Bearbeiten, Profilbild-Upload (Storage)

## Technischer Aufbau

**Frontend:** React + Tailwind + shadcn, dunkles Theme als Default, Inter/Geist-artige Typo, viel Whitespace, subtile Borders, keine bunten Akzente außer einem ruhigen Signal-Grün.

**Routen:** `/`, `/auth`, `/onboarding`, `/discover`, `/matches`, `/matches/:id`, `/profile`, `/reset-password`

**Datenmodell (Lovable Cloud / Postgres):**

```text
profiles         (id=auth.users.id, display_name, photo_url, location,
                  role, skills[], industry, stage, commitment, vision,
                  looking_for, onboarded_at)
swipes           (id, swiper_id, target_id, direction, created_at)
matches          (id, user_a, user_b, created_at)  -- erstellt bei mutual like
messages         (id, match_id, sender_id, body, created_at)
user_roles       (id, user_id, role)               -- für später (admin)
```

**Security:**
- RLS auf allen Tabellen
- `profiles`: jeder Eingeloggte kann lesen (für Discover), nur Owner schreibt
- `swipes`: nur Owner liest/schreibt eigene
- `matches`: nur Teilnehmer lesen
- `messages`: nur Teilnehmer des Matches lesen/schreiben
- Mutual-Match-Erstellung via Datenbank-Trigger auf `swipes`
- Trigger erstellt `profiles`-Zeile bei Signup

**Storage:** Bucket `avatars`, public read, write nur Owner.

**Realtime:** Postgres-Changes auf `messages` für Live-Chat.

## Vorgehen / Reihenfolge

1. Lovable Cloud aktivieren, Schema + RLS + Trigger anlegen
2. Auth-Seite + Provider + Guards
3. Landing Page bauen
4. Onboarding-Flow
5. Discover-Stack + Swipe-Logik
6. Matches-Liste + Realtime-Chat
7. Profil-Seite + Avatar-Upload
8. Polish, leere Zustände, Fehler-Handling

## Bewusst NICHT in V1

- Admin-Dashboard, Reporting/Moderation-Tools
- E-Mail-Benachrichtigungen bei neuen Matches (kann später via Edge Function + Resend)
- Erweiterte Matching-Algorithmen / Scoring
- Mobile Apps

Sag Bescheid, wenn etwas raus oder rein soll, sonst starte ich mit Schritt 1.