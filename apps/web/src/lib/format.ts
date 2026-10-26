const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** « 2026-10-23T14:41:07Z » → « 23 octobre 2026 ». */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** Pluriel simple : `plural(3, "mesure")` → « 3 mesures ». */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? pluralForm : singular}`;
}
