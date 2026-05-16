import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

const SKILL_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Go", "Rust",
  "iOS", "Android", "React Native", "Flutter",
  "AWS", "GCP", "Azure", "Kubernetes", "Docker", "DevOps",
  "Postgres", "Supabase", "Firebase", "GraphQL", "REST APIs",
  "Machine Learning", "AI / LLMs", "Data Engineering", "Analytics",
  "Product Management", "Product Discovery", "Roadmapping", "UX Research",
  "UI Design", "UX Design", "Brand Design", "Figma", "Webflow",
  "Sales", "B2B Sales", "Enterprise Sales", "Cold Outreach",
  "Marketing", "Growth", "SEO", "Content Marketing", "Performance Marketing",
  "Community", "Operations", "Finance", "Fundraising", "Pitching",
  "Hiring", "People Ops", "Legal", "GTM Strategy",
];

export function SkillsInput({
  value,
  onChange,
  placeholder = "Skill eingeben…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const lowerSet = new Set(value.map((s) => s.toLowerCase()));
    return SKILL_SUGGESTIONS.filter(
      (s) => s.toLowerCase().includes(q) && !lowerSet.has(s.toLowerCase()),
    ).slice(0, 6);
  }, [query, value]);

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, skill]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[0]) addSkill(suggestions[0]);
      else addSkill(query);
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
        />
        {showSuggestions && (
          <ul
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border bg-white py-1 shadow-lg"
            style={{ borderColor: "rgba(21,20,15,0.10)" }}
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addSkill(s);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[rgba(21,20,15,0.05)]"
                >
                  {s}
                </button>
              </li>
            ))}
            {query.trim() &&
              !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase()) && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addSkill(query);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-[var(--ember)] hover:bg-[rgba(226,81,28,0.06)]"
                  >
                    „{query.trim()}" hinzufügen
                  </button>
                </li>
              )}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium"
              style={{
                background: "rgba(226,81,28,0.10)",
                color: "var(--ink)",
                border: "1px solid rgba(226,81,28,0.25)",
              }}
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--smoke)] transition hover:bg-[rgba(21,20,15,0.10)] hover:text-[var(--ink)]"
                aria-label={`${s} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
