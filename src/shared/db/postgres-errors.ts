export function isPostgresUndefinedTableError(
  error: unknown,
  tableName?: string
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? error.message : undefined;

  if (code !== "42P01") {
    return false;
  }

  return (
    !tableName ||
    (typeof message === "string" && message.includes(`"${tableName}"`))
  );
}
