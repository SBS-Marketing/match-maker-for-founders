import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPartners from "./tools/list_partners";
import listEvents from "./tools/list_events";
import getMyProfile from "./tools/get_my_profile";
import listMyTasks from "./tools/list_my_tasks";
import createTask from "./tools/create_task";
import adminStats from "./tools/admin_stats";
import adminListEvents from "./tools/admin_list_events";
import adminAiUsage from "./tools/admin_ai_usage";
import adminListProfiles from "./tools/admin_list_profiles";
import adminPublishEvent from "./tools/admin_publish_event";
import adminCreateEvent from "./tools/admin_create_event";

// Direct Supabase issuer (project ref), inlined at build time by Vite.
// Never use the .lovable.cloud proxy URL — the discovery document publishes
// the supabase.co issuer and mcp-js rejects mismatches.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "matchfoundr-mcp",
  title: "matchfoundr MCP",
  version: "0.1.0",
  instructions:
    "Zugriff auf matchfoundr: Partner-Angebote, Community-Events, das eigene Profil sowie Daily-Tasks (lesen und anlegen). Aktionen erfolgen als der eingeloggte User.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listPartners,
    listEvents,
    getMyProfile,
    listMyTasks,
    createTask,
    adminStats,
    adminListEvents,
    adminAiUsage,
    adminListProfiles,
    adminPublishEvent,
    adminCreateEvent,
  ],
});
