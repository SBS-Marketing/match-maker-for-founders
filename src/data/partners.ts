import type { ServiceId } from "./services";
import { GENERATED_PARTNERS } from "./partners.generated";

export type Partner = {
  slug: string;
  name: string;
  firm: string;
  service: ServiceId;
  city: string;
  blurb: string;
  fit: number;
  sourceUrl?: string;
  bookingUrl?: string;
  scrapeStatus?: "ok" | "error";
  specialties: { label: string; level: number }[];
  packages: { name: string; price: string; desc: string }[];
  why: string[];
  vouches: { from: string; role: string; quote: string }[];
};

export const PARTNERS: Partner[] = GENERATED_PARTNERS;

export function partnersFor(service: ServiceId): Partner[] {
  return PARTNERS.filter((partner) => partner.service === service).sort((a, b) => b.fit - a.fit);
}
