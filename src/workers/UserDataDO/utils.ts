export const log = console.log.bind(console, "[UserDataDO]");
export const logError = console.error.bind(console, "[UserDataDO]");

export function isUniqueConstraintError(error: unknown): error is Error {
  return (
    error instanceof Error && error.message.includes("UNIQUE constraint failed")
  );
}
