import { SUPPORTED_LOCALES } from "../lib/locale";

interface Props {
  value: string;
  onChange: (locale: string) => void;
}

const LABELS: Record<string, string> = { en: "EN", sw: "SW" };

export function LanguageToggle({ value, onChange }: Props) {
  return (
    <div className="lang-toggle">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={l === value ? "active" : ""}
          onClick={() => onChange(l)}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
