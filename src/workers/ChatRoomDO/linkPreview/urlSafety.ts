/* eslint-disable no-magic-numbers */

const PRIVATE_IPV4_RANGES: Array<[number, number, number, number]> = [
  [0, 0, 0, 0xff000000],
  [10, 0, 0, 0xff000000],
  [100, 64, 0, 0xffc00000],
  [127, 0, 0, 0xff000000],
  [169, 254, 0, 0xffff0000],
  [172, 16, 0, 0xfff00000],
  [192, 0, 0, 0xffffff00],
  [192, 0, 2, 0xffffff00],
  [192, 168, 0, 0xffff0000],
  [198, 18, 0, 0xfffe0000],
  [198, 51, 100, 0xffffff00],
  [203, 0, 113, 0xffffff00],
  [224, 0, 0, 0xf0000000],
  [240, 0, 0, 0xf0000000],
];

function ipv4ToNumber(hostname: string): number | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    return value >= 0 && value <= 255 ? value : null;
  });
  if (octets.some((octet) => octet === null)) return null;

  return (
    (((octets[0] as number) << 24) |
      ((octets[1] as number) << 16) |
      ((octets[2] as number) << 8) |
      (octets[3] as number)) >>>
    0
  );
}

function isPrivateIpv4(hostname: string): boolean {
  const ip = ipv4ToNumber(hostname);
  if (ip === null) return false;

  return PRIVATE_IPV4_RANGES.some(([a, b, c, mask]) => {
    const rangeStart = (((a << 24) | (b << 16) | (c << 8)) >>> 0) & mask;
    return (ip & mask) === rangeStart;
  });
}

function normalizeIpv6Hostname(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const normalized = normalizeIpv6Hostname(hostname);
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function isPreviewableUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return false;
  }

  if (isPrivateIpv4(hostname)) return false;
  if (hostname.includes(":") && isPrivateOrLocalIpv6(hostname)) return false;

  return true;
}

export function parsePreviewableUrl(candidate: string): URL | null {
  try {
    const url = new URL(candidate);
    return isPreviewableUrl(url) ? url : null;
  } catch {
    return null;
  }
}
