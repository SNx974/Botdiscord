import { Queue } from "bullmq";
import { OCR_SCAN_QUEUE, parseRedisUrl, type OcrScanJob } from "@akd/shared";

declare global {
  // eslint-disable-next-line no-var
  var __ocrQueue: Queue<OcrScanJob> | undefined;
}

export const ocrQueue =
  global.__ocrQueue ??
  new Queue<OcrScanJob>(OCR_SCAN_QUEUE, { connection: parseRedisUrl(process.env.REDIS_URL!) });

if (process.env.NODE_ENV !== "production") {
  global.__ocrQueue = ocrQueue;
}
