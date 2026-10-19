"use client";

import { Dices, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { saveCharacterAction } from "@/app/actions/us";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { renderCharacterSvg, renderFrames } from "@/lib/character";
import {
  BACKGROUND_COLORS, DEFAULT_CHARACTER, HAIR_COLORS, NONE, SKIN_COLORS, VARIANTS,
  randomCharacter, sanitizeCharacter, type CharacterConfig, type CharacterKey,
} from "@/lib/character-options";
import { cn } from "@/lib/utils";
import { CharacterFigure } from "./CharacterFigure";

const TABS = ["face", "hair", "eyes", "mouth", "extras", "background"] as const;
type Tab = (typeof TABS)[number];

function Swatches({ label, value, colors, onPick }: { label: string; value: string; colors: string[]; onPick: (c: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={`#${c}`}
            onClick={() => onPick(c)}
            style={{ background: `#${c}` }}
            className={cn("h-10 w-10 rounded-full border border-black/10 transition active:scale-90", value === c && "ring-2 ring-cherry ring-offset-2 ring-offset-cream")}
          />
        ))}
      </div>
    </div>
  );
}

function Variants({
  label, field, values, config, onPick, withNone, zoom,
}: {
  label: string;
  field: CharacterKey;
  values: readonly string[];
  config: CharacterConfig;
  onPick: (v: string) => void;
  withNone?: boolean;
  zoom?: boolean;
}) {
  // Thumbnails show the whole current character with just this one part swapped.
  const base = JSON.stringify({ ...config, [field]: undefined });
  const thumbs = useMemo(
    () => values.map((v) => ({ v, svg: renderCharacterSvg({ ...JSON.parse(base), [field]: v }) })),
    [base, field, values],
  );
  const options = withNone ? [{ v: NONE, svg: "" }, ...thumbs] : thumbs;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2.5">
        {options.map(({ v, svg }, i) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={config[field] === v}
            aria-label={v === NONE ? `${label}: ${t.character.none}` : t.character.option(label, i + (withNone ? 0 : 1))}
            onClick={() => onPick(v)}
            className={cn(
              "relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-paper text-xs text-muted shadow-soft transition active:scale-95",
              config[field] === v && "ring-2 ring-cherry",
            )}
          >
            {svg ? (
              <span
                aria-hidden="true"
                className={cn("block h-full w-full [&>svg]:h-full [&>svg]:w-full", zoom && "scale-[1.9] origin-[50%_58%]")}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              t.character.none
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Build how you see your person: hair, eyes, glasses, freckles… saved for both of you to see. */
export function CharacterCreator({ initial, partnerName }: { initial: unknown; partnerName: string }) {
  const [config, setConfig] = useState<CharacterConfig>(() => sanitizeCharacter(initial));
  const [tab, setTab] = useState<Tab>("face");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: string; notice?: string }>();
  const frames = useMemo(() => renderFrames(config), [config]);

  const set = (key: CharacterKey, value: string) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setResult(undefined);
  };
  const props = { config };

  async function save() {
    if (saving) return;
    setSaving(true);
    setResult(undefined);
    const res = await saveCharacterAction(config);
    setSaving(false);
    setResult(res.ok ? { notice: t.character.saved } : { error: res.error });
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 bg-cream/90 px-5 pb-3 pt-2 backdrop-blur">
        <CharacterFigure frames={frames} label={t.character.previewAlt(partnerName)} className="mx-auto h-40 w-40" />
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="ghost" className="min-h-10 px-4" onClick={() => { setConfig(randomCharacter()); setResult(undefined); }}>
            <Dices className="h-4 w-4" aria-hidden /> {t.character.surprise}
          </Button>
          <Button variant="ghost" className="min-h-10 px-4" onClick={() => { setConfig(DEFAULT_CHARACTER); setResult(undefined); }}>
            <RotateCcw className="h-4 w-4" aria-hidden /> {t.character.reset}
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label={t.character.title} className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 pt-1">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="creator-panel"
            onClick={() => setTab(id)}
            className={cn("min-h-10 shrink-0 rounded-full border px-4 text-sm transition", tab === id ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper")}
          >
            {t.character.tabs[id]}
          </button>
        ))}
      </div>

      <div id="creator-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-6 pb-4 pt-2">
        {tab === "face" && (
          <>
            <Swatches label={t.character.groups.skin} value={config.skinColor} colors={SKIN_COLORS} onPick={(c) => set("skinColor", c)} />
            <Variants {...props} label={t.character.groups.head} field="head" values={VARIANTS.head} onPick={(v) => set("head", v)} />
          </>
        )}
        {tab === "hair" && (
          <>
            <Swatches label={t.character.groups.hairColor} value={config.hairColor} colors={HAIR_COLORS} onPick={(c) => set("hairColor", c)} />
            <Variants {...props} label={t.character.groups.hair} field="hair" values={VARIANTS.hair} onPick={(v) => set("hair", v)} />
          </>
        )}
        {tab === "eyes" && (
          <>
            <Variants {...props} label={t.character.groups.eyes} field="eyes" values={VARIANTS.eyes.filter((v) => v !== "variant19")} onPick={(v) => set("eyes", v)} zoom />
            <Variants {...props} label={t.character.groups.eyebrows} field="eyebrows" values={VARIANTS.eyebrows} onPick={(v) => set("eyebrows", v)} zoom />
          </>
        )}
        {tab === "mouth" && (
          <>
            <Variants {...props} label={t.character.groups.mouth} field="mouth" values={VARIANTS.mouth} onPick={(v) => set("mouth", v)} zoom />
            <Variants {...props} label={t.character.groups.nose} field="nose" values={VARIANTS.nose} onPick={(v) => set("nose", v)} zoom />
          </>
        )}
        {tab === "extras" && (
          <>
            <Variants {...props} label={t.character.groups.glasses} field="glasses" values={VARIANTS.glasses} onPick={(v) => set("glasses", v)} withNone zoom />
            <Variants {...props} label={t.character.groups.beard} field="beard" values={VARIANTS.beard} onPick={(v) => set("beard", v)} withNone zoom />
            <Variants {...props} label={t.character.groups.earrings} field="earrings" values={VARIANTS.earrings} onPick={(v) => set("earrings", v)} withNone zoom />
            <div>
              <p className="mb-2 text-sm font-medium">{t.character.groups.freckles}</p>
              <div role="radiogroup" aria-label={t.character.groups.freckles} className="flex gap-2">
                {[NONE, "on"].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={config.freckles === v} onClick={() => set("freckles", v)} className={cn("min-h-10 rounded-full border px-5 text-sm", config.freckles === v ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper")}>
                    {v === NONE ? t.character.none : t.character.on}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{t.character.groups.flowers}</p>
              <div role="radiogroup" aria-label={t.character.groups.flowers} className="flex gap-2">
                {[NONE, "flowers"].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={config.hairAccessories === v} onClick={() => set("hairAccessories", v)} className={cn("min-h-10 rounded-full border px-5 text-sm", config.hairAccessories === v ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper")}>
                    {v === NONE ? t.character.none : t.character.on}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {tab === "background" && <Swatches label={t.character.groups.background} value={config.backgroundColor} colors={BACKGROUND_COLORS} onPick={(c) => set("backgroundColor", c)} />}
      </div>

      <FormMessage error={result?.error} notice={result?.notice} className="mb-3" />
      <Button onClick={save} disabled={saving} aria-busy={saving} className="w-full">
        {saving ? (<><Spinner /> {t.character.saving}</>) : t.character.save}
      </Button>
    </div>
  );
}
