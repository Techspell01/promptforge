"use client";

import { Globe, Puzzle, Server, Smartphone, Terminal, Workflow, type LucideIcon } from "lucide-react";
import { Field, GroupLabel, Segmented, Select, TextInput } from "@/ui/primitives";
import {
  ARCHETYPE_LABELS,
  ARCHETYPES,
  BUDGET_RANGES,
  PLATFORM_LABELS,
  PLATFORMS,
  type Archetype,
  type Platform,
  type Settings,
} from "./settings.schema";

const DEFAULT_PLATFORM: Readonly<Record<Archetype, Platform>> = {
  web: "web",
  api: "server",
  cli: "desktop",
  mobile: "android",
  pipeline: "server",
  extension: "browser",
};

/** Short tile labels; the full names truncate in a three-column grid. */
const TILE_LABELS: Readonly<Record<Archetype, string>> = {
  web: "Web app",
  api: "API",
  cli: "CLI tool",
  mobile: "Mobile app",
  pipeline: "Pipeline",
  extension: "Extension",
};

const ARCHETYPE_ICONS: Readonly<Record<Archetype, LucideIcon>> = {
  web: Globe,
  api: Server,
  cli: Terminal,
  mobile: Smartphone,
  pipeline: Workflow,
  extension: Puzzle,
};

function ArchetypePicker({ value, onChange }: { value: Archetype; onChange: (value: Archetype) => void }) {
  return (
    <div>
      <GroupLabel>What are you building?</GroupLabel>
      <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ARCHETYPES.map((archetype) => {
          const selected = archetype === value;
          const Icon = ARCHETYPE_ICONS[archetype];
          return (
            <button
              key={archetype}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onChange(archetype);
              }}
              className={`group flex h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 text-left sm:px-3 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 ${
                selected
                  ? "border-inverse bg-inverse text-inverse-ink shadow-pill"
                  : "border-line-strong bg-card text-ink hover:border-control hover:bg-hover"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className={selected ? "" : "text-muted group-hover:text-ink"}
              />
              <span className="truncate" title={ARCHETYPE_LABELS[archetype]}>
                {TILE_LABELS[archetype]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ArchetypePicker
        value={settings.archetype}
        onChange={(archetype) => {
          onChange({ ...settings, archetype, platform: DEFAULT_PLATFORM[archetype] });
        }}
      />
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Field label="Platform" htmlFor="platform">
          <Select
            id="platform"
            value={settings.platform}
            onChange={(event) => {
              onChange({ ...settings, platform: event.target.value as Platform });
            }}
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stack" htmlFor="stack" hint="optional">
          <TextInput
            id="stack"
            placeholder="Next.js, Supabase, Tailwind…"
            maxLength={160}
            value={settings.stack}
            onChange={(event) => {
              onChange({ ...settings, stack: event.target.value });
            }}
          />
        </Field>
      </div>
      <div className="grid gap-5">
        <div>
          <GroupLabel
            hint={`${BUDGET_RANGES[settings.budget].min}–${BUDGET_RANGES[settings.budget].max} tokens`}
          >
            Length
          </GroupLabel>
          <Segmented
            name="Token budget"
            value={settings.budget}
            onChange={(budget) => {
              onChange({ ...settings, budget });
            }}
            options={[
              { value: "lean", label: "Lean" },
              { value: "standard", label: "Standard" },
              { value: "deep", label: "Deep" },
            ]}
          />
        </div>
        <div>
          <GroupLabel hint={settings.securityLevel === "paranoid" ? "full checklist" : "essentials"}>
            Security
          </GroupLabel>
          <Segmented
            name="Security level"
            value={settings.securityLevel}
            onChange={(securityLevel) => {
              onChange({ ...settings, securityLevel });
            }}
            options={[
              { value: "standard", label: "Standard" },
              { value: "paranoid", label: "Paranoid" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
