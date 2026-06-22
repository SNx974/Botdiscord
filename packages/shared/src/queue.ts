export const OCR_SCAN_QUEUE = "ocr-scan";

export interface OcrScanJob {
  matchId: string;
  screenshotUrl: string;
  /** Discord message id, when the screenshot was posted in Discord. */
  discordMsgId?: string;
  /** User who posted the screenshot, if known. */
  submittedByUserId?: string;
}

export interface OcrScanResult {
  resultId: string;
  matchId: string;
  extractedScoreA: number | null;
  extractedScoreB: number | null;
  presumedWinnerTeamId: string | null;
  confidence: "high" | "low" | "unparsed";
}
