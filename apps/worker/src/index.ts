import { Worker } from "bullmq";
import { OCR_SCAN_QUEUE, type OcrScanJob } from "@akd/shared";
import { bullConnectionOptions } from "./lib/redis.js";
import { processOcrScanJob } from "./processor.js";

const worker = new Worker<OcrScanJob>(OCR_SCAN_QUEUE, processOcrScanJob, {
  connection: bullConnectionOptions,
  concurrency: 4,
});

worker.on("completed", (job) => console.log(`[worker] scan complete for match ${job.data.matchId}`));
worker.on("failed", (job, err) => console.error(`[worker] scan failed for match ${job?.data.matchId}`, err));

console.log("[worker] OCR worker started, waiting for jobs...");
