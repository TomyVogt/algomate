type BioAnalysis = {
  tokenMap: Record<string, true>;
  bioLower: string;
};

function toLowerClean(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return toLowerClean(text).split(/\s+/).filter(Boolean);
}

function buildTokenMap(text: string): Record<string, true> {
  const tokens = tokenize(text);
  const map: Record<string, true> = Object.create(null);
  for (let i = 0; i < tokens.length; i++) {
    map[tokens[i]] = true;
  }
  return map;
}

export function analyzeBio(bio: string): BioAnalysis {
  const bioLower = toLowerClean(bio);
  const tokenMap = buildTokenMap(bioLower);
  return { tokenMap, bioLower };
}

export { toLowerClean };
