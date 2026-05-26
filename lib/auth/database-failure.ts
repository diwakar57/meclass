export function isDatabaseFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  if (
    /relation\s+"[^"]+"\s+does not exist/.test(normalized) ||
    /column\s+"[^"]+"\s+does not exist/.test(normalized) ||
    /relation\s+\S+\s+does not exist/.test(normalized) ||
    /column\s+\S+\s+does not exist/.test(normalized)
  ) {
    return true;
  }

  return [
    'econnrefused',
    'connect econnrefused',
    'no pg_hba.conf',
    'sasl',
    'enotfound',
    'invalid database_url',
    'missing database_url',
    'getaddrinfo',
    'invalid connection string',
    'connection terminated unexpectedly',
    'timeout',
    'undefined table',
    'undefined column',
    '42p01',
    '42703',
  ].some((needle) => normalized.includes(needle));
}
