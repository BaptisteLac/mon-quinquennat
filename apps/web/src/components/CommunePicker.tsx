"use client";

import { useEffect, useId, useState } from "react";
import { formStyles as styles } from "@/components/form/fields";
import { fetchCommunes, isPostalCode, type Commune } from "@/lib/communes";

interface Props {
  codePostal: string | undefined;
  codeCommune: string | undefined;
  onChange: (value: { codePostal: string; commune: Commune } | null) => void;
}

/** Commune choisie à partir du code postal (fichiers statiques du site : rien n'est envoyé à un tiers). */
export function CommunePicker({ codePostal, codeCommune, onChange }: Props) {
  const id = useId();
  const [cp, setCp] = useState(codePostal ?? "");
  const [communes, setCommunes] = useState<Commune[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isPostalCode(cp)) {
      setCommunes(null);
      return;
    }
    let cancelled = false;
    setError(false);
    fetchCommunes(cp)
      .then((list) => {
        if (cancelled) return;
        setCommunes(list);
        const only = list[0];
        if (list.length === 1 && only && only.codeCommune !== codeCommune) onChange({ codePostal: cp, commune: only });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // onChange et codeCommune changent à chaque rendu : on ne relance la recherche que sur le code postal.
  }, [cp]);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        <span>Ta commune</span>
        <span className={styles.labelHint}>facultatif</span>
      </label>
      <input
        id={id}
        className={styles.textInput}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        placeholder="Code postal"
        value={cp}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 5);
          setCp(next);
          if (next !== cp && codeCommune) onChange(null);
        }}
      />
      {error ? <div className={styles.help}>Liste des communes indisponible pour le moment.</div> : null}
      {communes && communes.length === 0 ? <div className={styles.help}>Aucune commune pour ce code postal.</div> : null}
      {communes && communes.length > 1 ? (
        <select
          className={styles.select}
          aria-label="Commune"
          value={codeCommune ?? ""}
          onChange={(e) => {
            const commune = communes.find((c) => c.codeCommune === e.target.value);
            if (commune) onChange({ codePostal: cp, commune });
          }}
        >
          <option value="" disabled>
            Choisir la commune…
          </option>
          {communes.map((c) => (
            <option key={c.codeCommune} value={c.codeCommune}>
              {c.nom}
            </option>
          ))}
        </select>
      ) : null}
      {communes && communes.length === 1 ? <div className={styles.help}>{communes[0]?.nom}</div> : null}
      <div className={styles.help}>Elle fixe la zone des aides au logement. Sans elle, la zone est estimée d&apos;après « Tu vis ».</div>
    </div>
  );
}
