export type SubmitterOutcome = "victory" | "defeat" | "unknown";

export interface VisionScoreResult {
  scoreA: number | null;
  scoreB: number | null;
  confidence: "high" | "low" | "unparsed";
  /**
   * What the end-of-game banner says from the submitter's point of view
   * (e.g. "DEFEAT"/"VICTORY") — far more reliable than mapping raw numeric
   * scores to a team, since neither team is labeled on screen.
   */
  submitterOutcome: SubmitterOutcome;
  raw: unknown;
}

export const SCORE_SYSTEM_PROMPT =
  "Tu analyses un screenshot de fin de partie e-sport, posté par un des joueurs. Réponds uniquement en JSON strict: " +
  '{"scoreA": number|null, "scoreB": number|null, "confidence": "high"|"low"|"unparsed", "submitterOutcome": "victory"|"defeat"|"unknown"}. ' +
  "scoreA est le score affiché en premier/à gauche, scoreB celui à droite (peu importe l'équipe). " +
  'submitterOutcome reflète le bandeau de résultat affiché sur l\'écran (ex: "DEFEAT"/"VICTORY", "DÉFAITE"/"VICTOIRE", ' +
  "\"YOU LOSE\"/\"YOU WIN\") : puisque c'est l'écran du joueur qui poste, ce bandeau indique si SON équipe a gagné " +
  '("victory") ou perdu ("defeat"). Mets "unknown" si aucun bandeau de résultat n\'est visible. ' +
  'Mets confidence à "high" si le score est affiché sans ambiguïté, "low" si tu dois deviner, ' +
  '"unparsed" (avec scoreA/scoreB à null) si aucun score n\'est lisible.';

export function parseScoreJson(raw: string): Omit<VisionScoreResult, "raw"> {
  try {
    const parsed = JSON.parse(raw);
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "low" || parsed.confidence === "unparsed"
        ? parsed.confidence
        : "unparsed";
    const submitterOutcome =
      parsed.submitterOutcome === "victory" || parsed.submitterOutcome === "defeat"
        ? parsed.submitterOutcome
        : "unknown";
    return {
      scoreA: typeof parsed.scoreA === "number" ? parsed.scoreA : null,
      scoreB: typeof parsed.scoreB === "number" ? parsed.scoreB : null,
      confidence,
      submitterOutcome,
    };
  } catch {
    return { scoreA: null, scoreB: null, confidence: "unparsed", submitterOutcome: "unknown" };
  }
}
