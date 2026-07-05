import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import { PageBackdrop } from "@/components/PageBackdrop";
import { useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "matchfoundr — Finde deinen Co-Founder" },
      {
        name: "description",
        content:
          "Ein fokussiertes Netzwerk für Gründer:innen auf der Suche nach ihrem ersten Partner. Echte Profile, kein Lebenslauf-Theater.",
      },
      { name: "author", content: "matchfoundr" },
      { property: "og:title", content: "matchfoundr — Finde deinen Co-Founder" },
      {
        property: "og:description",
        content:
          "Ein fokussiertes Netzwerk für Gründer:innen auf der Suche nach ihrem ersten Partner. Echte Profile, kein Lebenslauf-Theater.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "matchfoundr — Finde deinen Co-Founder" },
      {
        name: "twitter:description",
        content:
          "Ein fokussiertes Netzwerk für Gründer:innen auf der Suche nach ihrem ersten Partner. Echte Profile, kein Lebenslauf-Theater.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/26c0fb19-309d-44d0-9023-d94f2ebea7f5/id-preview-5ea9b318--41c05ab0-4da2-4cbd-9158-844edcb7bfe3.lovable.app-1779392066619.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/26c0fb19-309d-44d0-9023-d94f2ebea7f5/id-preview-5ea9b318--41c05ab0-4da2-4cbd-9158-844edcb7bfe3.lovable.app-1779392066619.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Landing + öffentliche Firmenprofile (/s/…) = eigene Seiten ohne App-Chrome.
  // Auth/Onboarding = bildschirmfüllende Flows. Alles andere = App-Shell.
  const isBare = pathname === "/" || pathname.startsWith("/s/");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isFlow = pathname.startsWith("/auth") || isOnboarding;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {isBare ? (
          <Outlet />
        ) : isFlow ? (
          <>
            <PageBackdrop variant={isOnboarding ? "dusk" : "sunrise"} />
            <main
              className="relative z-10 min-h-screen"
              style={{ background: isOnboarding ? "var(--ink)" : undefined }}
            >
              <Outlet />
            </main>
          </>
        ) : (
          <AppShell>
            <PageBackdrop variant="sunrise" />
            <Outlet />
          </AppShell>
        )}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
