const DIACRITICS: Record<string, string> = {
  č: "c",
  ć: "c",
  š: "s",
  ž: "z",
  đ: "dj",
  Č: "c",
  Ć: "c",
  Š: "s",
  Ž: "z",
  Đ: "dj",
};

export function slugify(input: string): string {
  const replaced = input.replace(/[čćšžđČĆŠŽĐ]/g, (ch) => DIACRITICS[ch] ?? ch);

  return replaced
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
