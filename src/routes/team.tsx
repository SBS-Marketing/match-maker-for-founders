import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Copy,
  Link2,
  LogIn,
  Megaphone,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readPlanContext } from "@/lib/plan-draft";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <TeamPage />
    </AuthGate>
  ),
});

type MemberStatus = "aktiv" | "eingeladen" | "extern";
type WorkStatus = "todo" | "in_progress" | "review" | "blocked" | "done";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  ownership: string;
  status: MemberStatus;
};

type TeamIdentity = {
  memberId: string;
  name: string;
  email: string;
  role: "owner" | "member";
};

type TeamMessage = {
  id: string;
  author: string;
  body: string;
  at: string;
};

type WorkItem = {
  id: string;
  title: string;
  owner: string;
  area: string;
  status: WorkStatus;
  progress: number;
  due: string;
};

type TeamPanel = "status" | "invite" | "work" | "members" | "chat";

const MEMBERS_KEY = "mf_team_members_v1";
const CHAT_KEY = "mf_team_chat_v1";
const BLACKBOARD_KEY = "mf_team_blackboard_v1";
const WORK_KEY = "mf_team_work_v1";
const IDENTITY_KEY = "mf_team_identity_v1";
const TEAM_INVITE_ID = "mf-demo-team";
const DUMMY_MEMBER: TeamMember = {
  id: "dummy-lea",
  name: "Lea Demo",
  role: "Operations",
  ownership: "Förderunterlagen, Calls, Follow-ups",
  status: "aktiv",
};

const STATUS_LABEL: Record<WorkStatus, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  review: "Review",
  blocked: "Blockiert",
  done: "Fertig",
};

const STATUS_STYLE: Record<WorkStatus, string> = {
  todo: "bg-[rgba(21,20,15,0.06)] text-[var(--smoke)]",
  in_progress: "bg-[rgba(226,81,28,0.12)] text-[var(--ember-deep)]",
  review: "bg-[rgba(68,113,94,0.13)] text-[#315f4d]",
  blocked: "bg-[rgba(132,43,24,0.14)] text-[var(--ember-deep)]",
  done: "bg-[var(--ember)] text-white",
};

const TEAM_PANELS: { id: TeamPanel; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "invite", label: "Invite" },
  { id: "work", label: "Arbeit" },
  { id: "members", label: "Team" },
  { id: "chat", label: "Chat" },
];

function TeamPage() {
  const context = useMemo(() => readPlanContext(), []);
  const [members, setMembers] = useState<TeamMember[]>(() => readMembers(context?.userName));
  const [messages, setMessages] = useState<TeamMessage[]>(() => readMessages());
  const [blackboard, setBlackboard] = useState(() => readBlackboard());
  const [workItems, setWorkItems] = useState<WorkItem[]>(() => readWorkItems(context?.userName));
  const [identity, setIdentity] = useState<TeamIdentity>(() => readTeamIdentity(context?.userName));
  const [name, setName] = useState("");
  const [role, setRole] = useState("Growth");
  const [chatText, setChatText] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<TeamPanel>("status");
  const isOwner = identity.role === "owner";
  const inviteUrl =
    typeof window === "undefined"
      ? `/team?invite=${TEAM_INVITE_ID}&as=lea`
      : `${window.location.origin}/team?invite=${TEAM_INVITE_ID}&as=lea`;
  const currentMember = members.find((member) => member.id === identity.memberId);
  const activeMembers = members.filter((member) => member.status === "aktiv").length;
  const inFlight = workItems.filter((item) => item.status === "in_progress").length;
  const blocked = workItems.filter((item) => item.status === "blocked").length;
  const averageProgress = workItems.length
    ? Math.round(workItems.reduce((sum, item) => sum + item.progress, 0) / workItems.length)
    : 0;

  useEffect(() => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(BLACKBOARD_KEY, blackboard);
  }, [blackboard]);

  useEffect(() => {
    localStorage.setItem(WORK_KEY, JSON.stringify(workItems));
  }, [workItems]);

  useEffect(() => {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  }, [identity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("invite") !== TEAM_INVITE_ID) return;

    joinAsDummyMember();
    window.history.replaceState(null, "", "/team?view=member");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addMember() {
    const cleanName = name.trim();
    if (!cleanName) return;
    setMembers((current) => [
      ...current,
      {
        id: `member-${Date.now()}`,
        name: cleanName,
        role: role.trim() || "Team",
        ownership: "Noch zuweisen",
        status: "eingeladen",
      },
    ]);
    setName("");
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setInviteCopied(false);
    }
  }

  function joinAsDummyMember() {
    setMembers((current) => upsertMember(current, DUMMY_MEMBER));
    setWorkItems((current) =>
      current.map((item) =>
        item.id === "mvp" ? { ...item, owner: DUMMY_MEMBER.name, status: "in_progress" } : item,
      ),
    );
    setIdentity({
      memberId: DUMMY_MEMBER.id,
      name: DUMMY_MEMBER.name,
      email: "lea.demo@matchfoundr.local",
      role: "member",
    });
    setMessages((current) => {
      if (current.some((message) => message.id === "dummy-joined")) return current;
      return [
        ...current,
        {
          id: "dummy-joined",
          author: "System",
          body: `${DUMMY_MEMBER.name} ist dem Team per Invite-Link beigetreten.`,
          at: new Date().toISOString(),
        },
      ];
    });
  }

  function switchToFounderView() {
    setIdentity({
      memberId: "founder",
      name: context?.userName || "Founder",
      email: "demo@matchfoundr.local",
      role: "owner",
    });
    if (typeof window !== "undefined") window.history.replaceState(null, "", "/team");
  }

  function updateMember(id: string, patch: Partial<TeamMember>) {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    );
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function updateWorkItem(id: string, patch: Partial<WorkItem>) {
    setWorkItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addWorkItem() {
    const title = workTitle.trim();
    if (!title) return;
    setWorkItems((current) => [
      ...current,
      {
        id: `work-${Date.now()}`,
        title,
        owner: members[0]?.name || "Team",
        area: "Sprint",
        status: "todo",
        progress: 0,
        due: "Diese Woche",
      },
    ]);
    setWorkTitle("");
  }

  function removeWorkItem(id: string) {
    setWorkItems((current) => current.filter((item) => item.id !== id));
  }

  function sendMessage() {
    const body = chatText.trim();
    if (!body) return;
    setMessages((current) => [
      ...current,
      {
        id: `msg-${Date.now()}`,
        author: identity.name,
        body,
        at: new Date().toISOString(),
      },
    ]);
    setChatText("");
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-7xl flex-col overflow-hidden px-3 pt-3 sm:h-auto sm:px-6 sm:pt-8">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">Team Workspace</div>
          <h1 className="mt-1 max-w-3xl text-[24px] font-semibold leading-tight tracking-tight sm:mt-2 sm:text-4xl">
            Team-Lage, Blackboard und laufende Arbeit.
          </h1>
          <p className="mt-2 hidden max-w-2xl text-[13.5px] leading-relaxed text-[var(--smoke)] sm:block">
            Ein Ort für Status, Owner, Invite-Links, offene Punkte und schnelle Abstimmung.
          </p>
          <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--ruled)] bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[var(--smoke)] sm:mt-3">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ember)]" />
            <span className="truncate">
              Ansicht: {identity.role === "owner" ? "Founder/Admin" : "Teammitglied"} ·{" "}
              {currentMember?.name || identity.name}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/kanban">
            <Button variant="ghost" className="glass-pill rounded-full px-4 text-[13px]">
              Kanban
            </Button>
          </Link>
          <Link to="/matches">
            <Button className="rounded-full bg-[var(--ember)] px-4 text-[13px] text-white shadow-ember hover:bg-[var(--ember-deep)]">
              Matches
            </Button>
          </Link>
        </div>
      </div>

      <section className="mt-3 grid shrink-0 grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
        <TeamStat
          label="Aktiv"
          value={`${activeMembers}/${members.length}`}
          note="Teammitglieder"
        />
        <TeamStat label="In Arbeit" value={String(inFlight)} note="laufende Workstreams" />
        <TeamStat
          label={blocked ? "Blocker" : "Fortschritt"}
          value={blocked ? String(blocked) : `${averageProgress}%`}
          note={blocked ? "braucht Entscheidung" : "Team-Schnitt"}
        />
      </section>

      <div className="mt-3 grid shrink-0 grid-cols-5 gap-1 rounded-[16px] border border-[var(--ruled)] bg-white/55 p-1 lg:hidden">
        {TEAM_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setActivePanel(panel.id)}
            className={[
              "h-9 rounded-[12px] px-1 text-[10.5px] font-semibold transition",
              activePanel === panel.id
                ? "bg-[var(--ember)] text-white shadow-ember"
                : "text-[var(--smoke)]",
            ].join(" ")}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <section
        className={[
          "glass-pane mt-3 shrink-0 gap-4 p-4 sm:mt-5 sm:p-5 lg:grid lg:grid-cols-[1fr_auto] lg:items-center",
          activePanel === "invite" ? "grid" : "hidden lg:grid",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-tint)] text-[var(--ember-deep)]">
            <Link2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight">Team per Link einladen</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--smoke)]">
              Der Link öffnet die App direkt als Teammitglied. Für den lokalen Test wird automatisch ein Dummy-Account genutzt.
            </p>
            <div className="mt-3 truncate rounded-xl border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-2 font-mono text-[11px] text-[var(--smoke)]">
              {inviteUrl}
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Button
            onClick={copyInviteLink}
            className="h-10 gap-2 rounded-xl bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
          >
            <Copy className="h-4 w-4" /> {inviteCopied ? "Kopiert" : "Link kopieren"}
          </Button>
          {identity.role === "owner" ? (
            <Button
              variant="ghost"
              onClick={joinAsDummyMember}
              className="glass-pill h-10 gap-2 rounded-xl px-4"
            >
              <LogIn className="h-4 w-4" /> Als Lea testen
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={switchToFounderView}
              className="glass-pill h-10 gap-2 rounded-xl px-4"
            >
              <LogIn className="h-4 w-4" /> Founder-Ansicht
            </Button>
          )}
        </div>
      </section>

      <div
        className={[
          "mt-3 min-h-0 flex-1 gap-4 lg:mt-5 lg:grid lg:grid-cols-[0.86fr_1.14fr]",
          activePanel === "status" || activePanel === "work" ? "grid" : "hidden lg:grid",
        ].join(" ")}
      >
        <section
          className={[
            "glass-pane-ink min-h-0 p-4 sm:p-5",
            activePanel === "status" ? "block" : "hidden lg:block",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                Blackboard
              </div>
              <div className="text-[15px] font-semibold text-[var(--cream)]">
                Nachricht für das ganze Team
              </div>
            </div>
          </div>
          <Textarea
            value={blackboard}
            onChange={(e) => setBlackboard(e.target.value)}
            readOnly={!isOwner}
            rows={6}
            className="min-h-[160px] resize-none rounded-2xl border-white/10 bg-white/10 text-[15px] leading-relaxed text-[var(--cream)] placeholder:text-white/35 focus:border-white/35"
            placeholder="Was muss das Team heute wissen?"
          />
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/50">
            <span>Automatisch lokal gespeichert</span>
            <span>{blackboard.trim().length} Zeichen</span>
          </div>
        </section>

        <section
          className={[
            "glass-pane min-h-0 flex-col p-4 sm:p-5 lg:flex",
            activePanel === "work" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Woran gearbeitet wird</div>
              <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
                Owner, Status und Fortschritt auf einen Blick.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-[var(--smoke)]" />
          </div>

          {isOwner && (
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="Neuer Workstream..."
              className="rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]"
            />
            <Button
              onClick={addWorkItem}
              disabled={!workTitle.trim()}
              className="rounded-2xl bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
              aria-label="Workstream hinzufügen"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {workItems.map((item) => (
              <WorkCard
                key={item.id}
                item={item}
                members={members}
                identity={identity}
                canManage={isOwner}
                onUpdate={(patch) => updateWorkItem(item.id, patch)}
                onRemove={() => removeWorkItem(item.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <div
        className={[
          "mt-3 min-h-0 flex-1 gap-4 lg:mt-5 lg:grid lg:grid-cols-[1fr_0.86fr]",
          activePanel === "members" || activePanel === "chat" ? "grid" : "hidden lg:grid",
        ].join(" ")}
      >
        <section
          className={[
            "glass-pane min-h-0 flex-col p-4 sm:p-5 lg:flex",
            activePanel === "members" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow">{isOwner ? "Team bearbeiten" : "Teammitglieder"}</div>
              <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
                {isOwner
                  ? "Rolle, Ownership und Status direkt anpassen."
                  : "Sieh, wer im Team ist und welche Ownership gerade liegt."}
              </p>
            </div>
            <UserRoundPlus className="h-5 w-5 text-[var(--smoke)]" />
          </div>

          {isOwner && (
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Rolle"
              className="rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]"
            />
            <Button
              onClick={addMember}
              disabled={!name.trim()}
              className="rounded-2xl bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
            >
              <Plus className="h-4 w-4" /> Hinzufügen
            </Button>
          </div>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                editable={isOwner}
                onUpdate={(patch) => updateMember(member.id, patch)}
                onRemove={() => removeMember(member.id)}
              />
            ))}
          </div>
        </section>

        <section
          className={[
            "glass-pane min-h-0 flex-col p-4 sm:p-5 lg:flex lg:min-h-[520px]",
            activePanel === "chat" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--indigo-grad)" }}>
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-semibold tracking-tight">Gruppenchat</div>
              <div className="text-[12px] text-[var(--smoke)]">
                Interner Team-Thread für nächste Schritte.
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--ruled)] bg-white/45 p-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl bg-white/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-semibold">{message.author}</div>
                  <div className="font-mono text-[10px] text-[var(--smoke)]">
                    {formatTime(message.at)}
                  </div>
                </div>
                <div className="mt-1 text-[13px] leading-relaxed text-[var(--ink)]">
                  {message.body}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Nachricht ans Team..."
              className="min-h-[52px] resize-none rounded-2xl bg-white/70 text-[13px]"
            />
            <Button
              onClick={sendMessage}
              disabled={!chatText.trim()}
              className="h-full min-h-[52px] rounded-2xl bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
              aria-label="Nachricht senden"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="glass-pane-soft min-w-0 p-3 sm:p-4">
      <div className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--smoke)] sm:text-[10px]">
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      <div className="mt-0.5 truncate text-[10.5px] text-[var(--smoke)] sm:text-[12px]">{note}</div>
    </div>
  );
}

function WorkCard({
  item,
  members,
  identity,
  canManage,
  onUpdate,
  onRemove,
}: {
  item: WorkItem;
  members: TeamMember[];
  identity: TeamIdentity;
  canManage: boolean;
  onUpdate: (patch: Partial<WorkItem>) => void;
  onRemove: () => void;
}) {
  const canEdit = canManage || item.owner === identity.name;
  const fieldClass = [
    "rounded-xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[12.5px] outline-none focus:border-[var(--ember)]",
    !canEdit ? "cursor-not-allowed opacity-70" : "",
  ].join(" ");

  return (
    <div className="rounded-2xl border border-[var(--ruled)] bg-white/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <input
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            readOnly={!canEdit}
            className={[
              "w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-[15px] font-semibold tracking-tight outline-none focus:border-[var(--ruled)] focus:bg-white/70",
              !canEdit ? "cursor-not-allowed" : "",
            ].join(" ")}
          />
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--smoke)]">
            <span>{item.area}</span>
            <span>·</span>
            <span>{item.due}</span>
          </div>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            STATUS_STYLE[item.status],
          ].join(" ")}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select
          value={item.owner}
          onChange={(e) => onUpdate({ owner: e.target.value })}
          disabled={!canManage}
          className={fieldClass}
        >
          {members.map((member) => (
            <option key={member.id} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>
        <select
          value={item.status}
          onChange={(e) => onUpdate({ status: e.target.value as WorkStatus })}
          disabled={!canEdit}
          className={fieldClass}
        >
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={item.due}
          onChange={(e) => onUpdate({ due: e.target.value })}
          readOnly={!canManage}
          className={fieldClass}
        />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={item.progress}
          onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
          disabled={!canEdit}
          className="accent-[var(--ember)]"
          aria-label={`${item.title} Fortschritt`}
        />
        <span className="w-10 text-right font-mono text-[11px] text-[var(--smoke)]">
          {item.progress}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <QuickStatusButton status="in_progress" item={item} disabled={!canEdit} onUpdate={onUpdate} />
          <QuickStatusButton status="review" item={item} disabled={!canEdit} onUpdate={onUpdate} />
          <QuickStatusButton status="done" item={item} disabled={!canEdit} onUpdate={onUpdate} />
        </div>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="glass-pill rounded-full">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuickStatusButton({
  status,
  item,
  disabled,
  onUpdate,
}: {
  status: WorkStatus;
  item: WorkItem;
  disabled: boolean;
  onUpdate: (patch: Partial<WorkItem>) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() =>
        onUpdate({
          status,
          progress:
            status === "done"
              ? 100
              : status === "review"
                ? Math.max(item.progress, 75)
                : item.progress,
        })
      }
      className={[
        "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
        disabled ? "cursor-not-allowed opacity-55" : "",
        item.status === status
          ? "bg-[var(--ember-tint)] text-[var(--ember-deep)]"
          : "bg-[rgba(21,20,15,0.06)] text-[var(--smoke)] hover:bg-[rgba(21,20,15,0.1)]",
      ].join(" ")}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

function MemberCard({
  member,
  editable,
  onUpdate,
  onRemove,
}: {
  member: TeamMember;
  editable: boolean;
  onUpdate: (patch: Partial<TeamMember>) => void;
  onRemove: () => void;
}) {
  const fieldClass = [
    "rounded-xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]",
    !editable ? "cursor-not-allowed opacity-75" : "",
  ].join(" ");

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--ruled)] bg-white/55 p-3 md:grid-cols-[44px_1fr_auto] md:items-center">
      <Avatar className="h-11 w-11">
        <AvatarFallback className="bg-[var(--ember)]/15 text-[var(--ember-deep)]">
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={member.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          readOnly={!editable}
          className={`${fieldClass} font-semibold`}
        />
        <input
          value={member.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          readOnly={!editable}
          className={fieldClass}
        />
        <input
          value={member.ownership}
          onChange={(e) => onUpdate({ ownership: e.target.value })}
          readOnly={!editable}
          className={fieldClass}
        />
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {(["aktiv", "eingeladen", "extern"] as const).map((status) => (
          <button
            key={status}
            onClick={() => onUpdate({ status })}
            disabled={!editable}
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
              !editable ? "cursor-not-allowed opacity-75" : "",
              member.status === status
                ? "bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                : "bg-[rgba(21,20,15,0.06)] text-[var(--smoke)]",
            ].join(" ")}
          >
            {status}
          </button>
        ))}
        {editable && member.id !== "founder" && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="glass-pill rounded-full">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function readTeamIdentity(userName?: string): TeamIdentity {
  const fallback: TeamIdentity = {
    memberId: "founder",
    name: userName || "Founder",
    email: "demo@matchfoundr.local",
    role: "owner",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null") as TeamIdentity | null;
    return stored?.memberId && stored?.name ? stored : fallback;
  } catch {
    return fallback;
  }
}

function upsertMember(members: TeamMember[], member: TeamMember): TeamMember[] {
  const exists = members.some((item) => item.id === member.id);
  if (exists) {
    return members.map((item) => (item.id === member.id ? { ...item, ...member } : item));
  }
  return [...members, member];
}

function readMembers(userName?: string): TeamMember[] {
  const defaults: TeamMember[] = [
    {
      id: "founder",
      name: userName || "Founder",
      role: "CEO / Produkt",
      ownership: "Vision, Produkt, Funding",
      status: "aktiv",
    },
    {
      id: "tech",
      name: "Tech Co-Founder",
      role: "CTO",
      ownership: "MVP, Architektur, Daten",
      status: "eingeladen",
    },
    {
      id: "advisor",
      name: "Startup Advisor",
      role: "Advisor",
      ownership: "Förderung, Netzwerk, Sparring",
      status: "extern",
    },
  ];
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(MEMBERS_KEY) || "null") as TeamMember[] | null;
    return stored?.length ? stored : defaults;
  } catch {
    return defaults;
  }
}

function readWorkItems(userName?: string): WorkItem[] {
  const defaults: WorkItem[] = [
    {
      id: "exist",
      title: "EXIST-Antrag: offene Unterlagen schließen",
      owner: userName || "Founder",
      area: "Funding",
      status: "in_progress",
      progress: 65,
      due: "Heute",
    },
    {
      id: "mvp",
      title: "Mobile Dashboard und Team-Workspace verfeinern",
      owner: "Tech Co-Founder",
      area: "Produkt",
      status: "in_progress",
      progress: 55,
      due: "Diese Woche",
    },
    {
      id: "partner",
      title: "Mentor- und Growth-Partner shortlist prüfen",
      owner: "Startup Advisor",
      area: "Partner",
      status: "review",
      progress: 80,
      due: "Morgen",
    },
  ];
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(WORK_KEY) || "null") as WorkItem[] | null;
    return stored?.length ? stored : defaults;
  } catch {
    return defaults;
  }
}

function readBlackboard(): string {
  const fallback =
    "Heute Fokus: EXIST-Unterlagen schließen, MVP-Screens mobil prüfen und Partner-Outreach vorbereiten. Blocker bitte direkt hier oder im Chat posten.";
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(BLACKBOARD_KEY) || fallback;
}

function readMessages(): TeamMessage[] {
  const defaults: TeamMessage[] = [
    {
      id: "welcome",
      author: "Co-Pilot",
      body: "Ich habe Team, Kanban und Förderpaket als gemeinsame Arbeitsfläche vorbereitet. Nächster Schritt: Owner für EXIST, Produkt und Growth festziehen.",
      at: new Date().toISOString(),
    },
  ];
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(CHAT_KEY) || "null") as TeamMessage[] | null;
    return stored?.length ? stored : defaults;
  } catch {
    return defaults;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
