import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/steuer")({
  component: Outlet,
});
