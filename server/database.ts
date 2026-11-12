export function getDatabaseUrl(): string {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("NEON_DATABASE_URL or DATABASE_URL is required for database storage");
  }
  return connectionString;
}
