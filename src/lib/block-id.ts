/** Stabilan (nekriptografski) hash teksta pasusa - koristi se kao blok-sidro za napomene
 * dodate iz prikaza clanka (bez potrebe za write pristupom/editorom). Cist JS, radi
 * identicno na serveru i u browseru (bez zavisnosti od Prisma/Node modula), pa je bezbedno
 * uvoziti i iz klijentskih komponenti. Ako se tekst pasusa izmeni, stare napomene se
 * "odvezu" od njega - prihvatljivo, jer se napomena odnosila na tekst koji vise ne postoji. */
export function blockIdFor(text: string): string {
  const trimmed = text.trim();
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 33) ^ trimmed.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
