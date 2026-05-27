export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processItem: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("batchSize must be a positive integer");
  }

  const results: R[] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const batchResults = await Promise.all(
      batch.map((item, offset) => processItem(item, start + offset)),
    );
    results.push(...batchResults);
  }

  return results;
}
