export function getDirectDatabaseUrl(): string {
  const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_DIRECT_URL or DATABASE_URL is not set. Check your .env (see .env.example at the monorepo root).',
    );
  }
  return url;
}
