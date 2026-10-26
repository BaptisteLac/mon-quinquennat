/** Mélange de Fisher-Yates ; `random` renvoie un nombre dans [0, 1). */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Tirage uniforme non prévisible (API Web Crypto, disponible dans le navigateur et Node). */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] as number) / 2 ** 32;
}
