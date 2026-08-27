// Guesses an Intuit email from a full name, following the firstname_restofname@intuit.com
// pattern confirmed across many real records this session (e.g. "Amir Ben Ishay" ->
// amir_benishay@intuit.com — first token, then every remaining token concatenated with
// no separator, lowercased; hyphens in a name are preserved).
function normalize(part: string): string {
  return part.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function guessIntuitEmail(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${normalize(parts[0])}@intuit.com`;
  const first = normalize(parts[0]);
  const rest = normalize(parts.slice(1).join(""));
  return `${first}_${rest}@intuit.com`;
}
