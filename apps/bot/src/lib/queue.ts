import { Queue } from "bullmq";
import { OCR_SCAN_QUEUE, parseRedisUrl, type OcrScanJob } from "@akd/shared";
import { env } from "../env.js";

export const ocrQueue = new Queue<OcrScanJob>(OCR_SCAN_QUEUE, {
  connection: parseRedisUrl(env.REDIS_URL),
});
