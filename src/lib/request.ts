import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";

export function getRequestMetadata() {
  const headerList = headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    headerList.get("cf-connecting-ip") ??
    undefined;
  const userAgent = headerList.get("user-agent") ?? "Unknown";
  const parsed = new UAParser(userAgent).getResult();

  const browserLabel = [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ");
  const platformLabel = [parsed.os.name, parsed.os.version].filter(Boolean).join(" ");
  const deviceLabel =
    [browserLabel, platformLabel, parsed.device.type ?? "desktop"].filter(Boolean).join(" | ") ||
    "Unknown device";

  return {
    ipAddress,
    userAgent,
    deviceLabel,
  };
}
