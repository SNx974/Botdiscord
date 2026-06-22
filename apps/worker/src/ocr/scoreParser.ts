import type { SubmitterOutcome } from "./scoreSchema.js";

export interface ParsedScore {
  scoreA: number | null;
  scoreB: number | null;
  confidence: "high" | "low" | "unparsed";
  submitterOutcome: SubmitterOutcome;
}

const VICTORY_WORDS = /\b(victory|victoire|win|you win|vainqueur)\b/i;
const DEFEAT_WORDS = /\b(defeat|d[ée]faite|lose|you lose|loss)\b/i;

function detectSubmitterOutcome(text: string): SubmitterOutcome {
  if (VICTORY_WORDS.test(text)) return "victory";
  if (DEFEAT_WORDS.test(text)) return "defeat";
  return "unknown";
}

/**
 * End-of-game overlays vary a lot per game, so we don't try to parse a
 * specific layout. Instead: look for an explicit "N - N" score pattern
 * first (high confidence), and fall back to the first two standalone
 * numbers found in the OCR text (low confidence). Admins can always
 * override a disputed/unparsed result manually.
 */
export function parseScore(text: string): ParsedScore {
  const submitterOutcome = detectSubmitterOutcome(text);
  const scorePattern = /(\d{1,3})\s*[-–:]\s*(\d{1,3})/;
  const explicitMatch = text.match(scorePattern);
  if (explicitMatch) {
    return {
      scoreA: Number(explicitMatch[1]),
      scoreB: Number(explicitMatch[2]),
      confidence: "high",
      submitterOutcome,
    };
  }

  const numbers = text.match(/\d{1,3}/g);
  if (numbers && numbers.length >= 2) {
    return { scoreA: Number(numbers[0]), scoreB: Number(numbers[1]), confidence: "low", submitterOutcome };
  }

  return { scoreA: null, scoreB: null, confidence: "unparsed", submitterOutcome };
}
