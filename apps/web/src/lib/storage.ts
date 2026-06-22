import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export async function uploadScreenshot(buffer: Buffer, contentType: string): Promise<string> {
  const bucket = process.env.S3_BUCKET!;
  const key = `screenshots/${randomUUID()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  // S3_PUBLIC_URL is the publicly reachable base (already includes the bucket
  // path), since S3_ENDPOINT is only reachable inside the private network and
  // Discord/the browser both need a real URL to fetch the image from.
  const publicBase = process.env.S3_PUBLIC_URL ?? `${process.env.S3_ENDPOINT}/${bucket}`;
  return `${publicBase}/${key}`;
}
