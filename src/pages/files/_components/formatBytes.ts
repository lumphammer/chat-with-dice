const UNITS = ["B", "KB", "MB", "GB"] as const;
const THRESHOLD = 1024;

export function formatBytes(bytes: number): string {
  let unitIndex = 0;
  let value = bytes;

  while (value >= THRESHOLD && unitIndex < UNITS.length - 1) {
    value /= THRESHOLD;
    unitIndex++;
  }

  const formatted = unitIndex === 0 ? value.toString() : value.toFixed(1);
  return `${formatted} ${UNITS[unitIndex]}`;
}
