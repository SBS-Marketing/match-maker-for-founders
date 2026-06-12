// Geteilter Renderer für Firmenprofil-Blöcke — genutzt vom Builder-Preview
// (/firma) und der öffentlichen Profilseite (/s/$slug).

import { Link } from "@tanstack/react-router";
import { ExternalLink, Image as ImageIcon, Sparkles, Video } from "lucide-react";
import { videoEmbedSrc, type CompanyBlock, type CompanyComposition } from "@/lib/company-blocks";

export function CompanyBlocksView({ composition }: { composition: CompanyComposition }) {
  return (
    <div>
      {composition.blocks.map((block) => (
        <PreviewBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

export function PreviewBlock({ block }: { block: CompanyBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <section
          className="px-6 py-12 text-white sm:px-10 sm:py-16"
          style={{ background: "var(--ember-grad)" }}
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {block.eyebrow}
              </div>
              <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {block.title}
              </h2>
              <div className="mt-2 text-[14px] font-medium text-white/80">{block.subtitle}</div>
              {block.body && (
                <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/85 sm:text-[18px]">
                  {block.body}
                </p>
              )}
              {block.ctaLabel && (
                <a
                  href={block.ctaHref || "#"}
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[var(--ember-deep)] hover:bg-[var(--cream)]"
                >
                  {block.ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {block.imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                <img src={block.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                <ImageIcon className="h-8 w-8 text-white/40" />
              </div>
            )}
          </div>
        </section>
      );
    case "about":
    case "text":
      return (
        <section className="border-b border-[var(--ruled)] px-6 py-10 sm:px-10">
          {block.title && (
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember-deep)]">
              {block.title}
            </div>
          )}
          <p className="mt-3 max-w-3xl whitespace-pre-line text-[15.5px] leading-relaxed text-[var(--ink)]">
            {block.body}
          </p>
        </section>
      );
    case "metrics":
      return (
        <section className="border-b border-[var(--ruled)] bg-[var(--surface-soft)] px-6 py-8 sm:px-10">
          {block.title && (
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
              {block.title}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {block.items.map((m, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-5"
              >
                <div className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
                  {m.value || "—"}
                </div>
                <div className="mt-1 text-[12.5px] text-[var(--smoke)]">{m.label}</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "highlights":
      return (
        <section className="border-b border-[var(--ruled)] px-6 py-10 sm:px-10">
          {block.title && (
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember-deep)]">
              {block.title}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.filter(Boolean).map((it, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ember-tint)] text-[var(--ember-deep)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="mt-3 text-[14px] font-semibold leading-snug text-[var(--ink)]">
                  {it}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case "image":
      return (
        <section className="border-b border-[var(--ruled)] px-6 py-10 sm:px-10">
          {block.url ? (
            <figure>
              <div
                className="overflow-hidden rounded-2xl border border-[var(--ruled)] bg-[var(--surface-soft)]"
                style={{ aspectRatio: block.aspect.replace("/", " / ") }}
              >
                <img
                  src={block.url}
                  alt={block.caption || ""}
                  className="h-full w-full object-cover"
                />
              </div>
              {block.caption && (
                <figcaption className="mt-2 text-[12.5px] text-[var(--smoke)]">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[var(--ruled)] bg-[var(--surface-soft)] text-[var(--faint)]">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </section>
      );
    case "video":
      return (
        <section className="border-b border-[var(--ruled)] px-6 py-10 sm:px-10">
          {block.url ? (
            <figure>
              <VideoFrame url={block.url} />
              {block.caption && (
                <figcaption className="mt-2 text-[12.5px] text-[var(--smoke)]">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[var(--ruled)] bg-[var(--surface-soft)] text-[var(--faint)]">
              <Video className="h-6 w-6" />
            </div>
          )}
        </section>
      );
    case "team":
      return (
        <section className="border-b border-[var(--ruled)] bg-[var(--surface-soft)] px-6 py-10 sm:px-10">
          {block.title && (
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember-deep)]">
              {block.title}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {block.members.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--ember-tint)] text-[15px] font-semibold text-[var(--ember-deep)]">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    (m.name || "?").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[var(--ink)]">
                    {m.name || "—"}
                  </div>
                  <div className="truncate text-[12.5px] text-[var(--smoke)]">{m.role}</div>
                  {m.linkedin && (
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--ember-deep)]"
                    >
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="px-6 py-12 sm:px-10">
          <div className="rounded-3xl border border-[var(--ruled)] bg-[var(--ink)] p-6 text-[var(--cream)] sm:p-10">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{block.headline}</h3>
            {block.body && (
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/75">
                {block.body}
              </p>
            )}
            <Link
              to={(block.href || "/matches") as "/matches"}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ember)] px-5 text-[13px] font-semibold text-white hover:bg-[var(--ember-deep)]"
            >
              {block.label} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      );
  }
}

export function VideoFrame({ url }: { url: string }) {
  const src = videoEmbedSrc(url);
  if (!src) return null;
  const isFile = /\.(mp4|webm|ogg)(\?|$)/i.test(src);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--ruled)] bg-black">
      {isFile ? (
        <video src={src} controls className="aspect-video w-full" />
      ) : (
        <iframe
          src={src}
          className="aspect-video w-full"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
