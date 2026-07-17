/**
 * The list of capabilities the room can mount. Lives in its own tiny module
 * so both `serverCapabilityRegistry` and `clientCapabilityRegistry` can refer
 * to the same canonical names without dragging one half into the other half's
 * import graph.
 */
export const capabilityNames = [
  "counter",
  "objectives",
  "adversaries",
  "roll",
  "laserfeelings",
  "files",
  "cards",
  "feedback",
  "users",
] as const;

export type CapabilityName = (typeof capabilityNames)[number];

export function isCapabilityName(
  name: string | undefined | null,
): name is CapabilityName {
  return !!name && (capabilityNames as readonly string[]).includes(name);
}
