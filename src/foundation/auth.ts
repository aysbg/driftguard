export function resolveFoundationToken(
  options?: { token?: string; envToken?: string; configToken?: string },
): string | undefined {
  if (options?.token !== undefined && options.token !== '') {
    return options.token;
  }
  const env = options?.envToken ?? process.env.DRIFTGUARD_FOUNDATION_TOKEN;
  if (env !== undefined && env !== '') {
    return env;
  }
  if (options?.configToken !== undefined && options.configToken !== '') {
    return options.configToken;
  }
  return undefined;
}

export function redactToken(input: string, token?: string): string {
  if (token !== undefined && token !== '') {
    return input.split(token).join('[REDACTED]');
  }
  // Default redaction: replace anything that looks like a bearer token (50+ alphanumeric chars)
  return input.replace(/\b[a-zA-Z0-9]{50,}\b/g, '[REDACTED]');
}
