export interface VisionScoreResult {
  scoreA: number | null;
  scoreB: number | null;
  confidence: "high" | "low" | "unparsed";
  raw: unknown;
}

export const SCORE_SYSTEM_PROMPT =
  "Tu analyses un screenshot de fin de partie e-sport. Réponds uniquement en JSON strict: " +
  '{"scoreA": number|null, "scoreB": number|null, "confidence": "high"|"low"|"unparsed"}. ' +
  "scoreA est le score de l'équipe affichée en premier/à gauche, scoreB celui de l'équipe à droite. " +
  'Mets confidence à "high" si le score est affiché sans ambiguïté, "low" si tu dois deviner, ' +
  '"unparsed" (avec scoreA/scoreB à null) si aucun score n\'est lisible.';

export function parseScoreJson(raw: string): Omit<VisionScoreResult, "raw"> {
  try {
    const parsed = JSON.parse(raw);
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "low" || parsed.confidence === "unparsed"
        ? parsed.confidence
        : "unparsed";
    return {
      scoreA: typeof parsed.scoreA === "number" ? parsed.scoreA : null,
      scoreB: typeof parsed.scoreB === "number" ? parsed.scoreB : null,
      confidence,
    };
  } catch {
    return { scoreA: null, scoreB: null, confidence: "unparsed" };
  }
}
