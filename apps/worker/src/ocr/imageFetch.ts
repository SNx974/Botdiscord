function sniffImageFormat(buffer: Buffer): string {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpeg";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP")
    return "webp";
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  return `unknown (first bytes: ${buffer.subarray(0, 16).toString("hex")})`;
}

export async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl, {
    headers: { accept: "image/*", "user-agent": "Mozilla/5.0 (compatible; MatchmakingAKD-Worker/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to download screenshot: ${res.status} ${res.statusText}`);

  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());

  console.log(
    `[worker] downloaded screenshot: ${buffer.length} bytes, content-type=${mimeType}, sniffed=${sniffImageFormat(buffer)}`
  );

  return { data: buffer.toString("base64"), mimeType };
}
