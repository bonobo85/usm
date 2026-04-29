export const RANGS = [
  { level: 1, nom: "BCSO", couleur: "#4A5670" },
  { level: 2, nom: "USM", couleur: "#6B7B9C" },
  { level: 3, nom: "USM Confirmé", couleur: "#1B3E7C" },
  { level: 4, nom: "Formateur", couleur: "#2E5AA8" },
  { level: 5, nom: "Opérateur Second", couleur: "#8B6A42" },
  { level: 6, nom: "Opérateur", couleur: "#A67C4E" },
  { level: 7, nom: "Co-Leader", couleur: "#D43A4F" },
  { level: 8, nom: "Leader", couleur: "#B32134" },
  { level: 9, nom: "Shériff", couleur: "#C9994F" },
] as const;

export const ORDRE_BADGES = [
  "CRASH","FORMATEUR","INSTRUCTEUR","NEGOCIATEUR","BMO","DRONE","GAV","BRACELET","FEDERAL"
] as const;

export const BADGES_META: Record<string, { nom: string; couleur: string; description: string }> = {
  CRASH:       { nom: "CRASH",       couleur: "#B32134", description: "Unité CRASH" },
  FORMATEUR:   { nom: "Formateur",   couleur: "#2E5AA8", description: "Formateur certifié" },
  INSTRUCTEUR: { nom: "Instructeur", couleur: "#1B3E7C", description: "Instructeur" },
  NEGOCIATEUR: { nom: "Négociateur", couleur: "#A67C4E", description: "Négociateur" },
  BMO:         { nom: "BMO",         couleur: "#8B6A42", description: "Brigade Motorisée" },
  DRONE:       { nom: "Drone",       couleur: "#4A5670", description: "Opérateur Drone" },
  GAV:         { nom: "GAV",         couleur: "#6B7B9C", description: "Garde à Vue" },
  BRACELET:    { nom: "Bracelet",    couleur: "#D43A4F", description: "Bracelet électronique" },
  FEDERAL:     { nom: "Fédéral",     couleur: "#C9994F", description: "Mandat fédéral" },
};

export const trierBadges = (codes: string[]) =>
  [...codes].sort((a, b) => ORDRE_BADGES.indexOf(a as any) - ORDRE_BADGES.indexOf(b as any));

export const getRang = (level: number) => RANGS.find(r => r.level === level) ?? RANGS[0];

export const estOpSecondMin  = (r: number) => r >= 5;
export const estOperateurMin = (r: number) => r >= 6;
export const estColeadMin    = (r: number) => r >= 7;
export const estLeadMin      = (r: number) => r >= 8;

export const peutVoirCrash       = (r: number, b: string[]) => estColeadMin(r) || b.includes("CRASH");
export const peutVoirFormateurs  = (r: number, b: string[]) => estColeadMin(r) || b.includes("FORMATEUR");
export const peutAttribuerRang   = (rangActeur: number, rangCible: number) =>
  rangActeur >= 7 && rangCible < rangActeur;

export const contrastText = (hex: string) => {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 > 128 ? "#0B1221" : "#E8ECF2";
};
