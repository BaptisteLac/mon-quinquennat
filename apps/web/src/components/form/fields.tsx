"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./form.module.css";

export { styles as formStyles };

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface ChoiceProps<T extends string> {
  legend: ReactNode;
  hint?: ReactNode;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  size?: "small";
  shape?: "pill";
  /** Question visuellement intégrée à une ligne (sans titre en capitales). */
  inlineLegend?: boolean;
}

/** Une question à choix unique : boutons radio natifs (clavier et lecteurs d'écran), stylés en boutons. */
export function Choice<T extends string>({ legend, hint, options, value, onChange, columns, size, shape, inlineLegend }: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.field}>
      <legend className={inlineLegend ? styles.subTitle : styles.label}>
        <span>{legend}</span>
        {hint ? <span className={styles.labelHint}>{hint}</span> : null}
      </legend>
      <div className={styles.options} data-columns={columns} data-size={size} data-shape={shape}>
        {options.map((o) => (
          <label key={o.value} className={styles.option}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const YES_NO = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
] as const;

export function YesNo(props: { legend: ReactNode; hint?: ReactNode; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <Choice
      legend={props.legend}
      hint={props.hint}
      inlineLegend
      shape="pill"
      options={YES_NO}
      value={props.value === undefined ? undefined : props.value ? "oui" : "non"}
      onChange={(v) => props.onChange(v === "oui")}
    />
  );
}

interface NumberStepperProps {
  label: ReactNode;
  value: number | undefined;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** Valeur proposée au premier appui sur − ou + quand rien n'est saisi. */
  start: number;
  unit: string;
  hint?: ReactNode;
  inline?: boolean;
}

/** Nombre entier : saisie directe ou boutons − / +. */
export function NumberStepper({ label, value, onChange, min, max, start, unit, hint, inline }: NumberStepperProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={inline ? styles.subTitle : styles.label}>
        <span>{label}</span>
        {hint ? <span className={styles.labelHint}>{hint}</span> : null}
      </label>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="Moins"
          disabled={value !== undefined && value <= min}
          onClick={() => onChange(value === undefined ? start : clamp(value - 1))}
        >
          −
        </button>
        <span className={styles.stepperValue}>
          <input
            id={id}
            className={styles.stepperInput}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            placeholder="…"
            value={value ?? ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
            }}
          />
          {unit}
        </span>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="Plus"
          disabled={value !== undefined && value >= max}
          onClick={() => onChange(value === undefined ? start : clamp(value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface MoneyProps {
  label: ReactNode;
  value: number | undefined;
  onChange: (v: number) => void;
  /** Borne du curseur ; la saisie directe accepte davantage. */
  rangeMax: number;
  step: number;
  unit?: string;
  help?: ReactNode;
  inline?: boolean;
}

/** Montant en euros : saisie directe (montant exact) et curseur (ordre de grandeur). */
export function MoneyField({ label, value, onChange, rangeMax, step, unit = "€", help, inline }: MoneyProps) {
  const id = useId();
  const fill = value === undefined ? 0 : Math.min(100, (value / rangeMax) * 100);
  return (
    <div className={styles.field}>
      <div className={styles.moneyHead}>
        <label htmlFor={id} className={inline ? styles.subTitle : styles.label}>
          {label}
        </label>
        <span className={styles.moneyValue}>
          <input
            id={id}
            className={styles.moneyInput}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="…"
            value={value ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n) && n >= 0) onChange(Math.round(n));
            }}
          />
          {unit}
        </span>
      </div>
      <input
        className={styles.range}
        type="range"
        min={0}
        max={rangeMax}
        step={step}
        value={Math.min(value ?? 0, rangeMax)}
        data-unset={value === undefined}
        style={{ ["--fill" as string]: `${fill}%` }}
        aria-label={typeof label === "string" ? `${label} (curseur)` : "Montant (curseur)"}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {help ? <div className={styles.help}>{help}</div> : null}
    </div>
  );
}

const ARROW = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Bouton principal : lien quand l'étape est complète, sinon inactif avec ce qui manque. */
export function NextAction({ href, children, missing }: { href: string; children: ReactNode; missing: readonly string[] }) {
  if (missing.length === 0) {
    return (
      <Link href={href} className={styles.primary}>
        {children}
        {ARROW}
      </Link>
    );
  }
  return (
    <>
      <span className={styles.primary} aria-disabled="true" role="link">
        {children}
        {ARROW}
      </span>
      <p className={styles.missing} aria-live="polite">
        Il manque {missing.join(", ")}.
      </p>
    </>
  );
}

export function FlowTop({ back, pill }: { back: string | null; pill: ReactNode }) {
  return (
    <div className={styles.top}>
      {back ? (
        <Link href={back} className={styles.back} aria-label="Retour">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      ) : (
        <Link href="/" className={styles.brand}>
          Mon quinquennat
        </Link>
      )}
      <span className={styles.pill}>{pill}</span>
    </div>
  );
}
