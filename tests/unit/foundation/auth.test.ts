import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveFoundationToken, redactToken } from '../../../src/foundation/auth.js';

describe('resolveFoundationToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DRIFTGUARD_FOUNDATION_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('CLI token takes highest priority', () => {
    expect(
      resolveFoundationToken({
        token: 'cli-token',
        envToken: 'env-token',
        configToken: 'config-token',
      }),
    ).toBe('cli-token');
  });

  it('falls back to env var when CLI token is absent', () => {
    process.env.DRIFTGUARD_FOUNDATION_TOKEN = 'env-process-token';
    expect(resolveFoundationToken({ configToken: 'config-token' })).toBe('env-process-token');
  });

  it('falls back to envToken option over process env', () => {
    process.env.DRIFTGUARD_FOUNDATION_TOKEN = 'env-process-token';
    expect(resolveFoundationToken({ envToken: 'env-opt-token' })).toBe('env-opt-token');
  });

  it('falls back to configToken when no env token is set', () => {
    expect(resolveFoundationToken({ configToken: 'config-token' })).toBe('config-token');
  });

  it('returns undefined when nothing is provided', () => {
    expect(resolveFoundationToken()).toBeUndefined();
  });

  it('skips empty string values', () => {
    process.env.DRIFTGUARD_FOUNDATION_TOKEN = '';
    expect(resolveFoundationToken({ token: '', envToken: '', configToken: '' })).toBeUndefined();
  });
});

describe('redactToken', () => {
  it('replaces occurrences of provided token with [REDACTED]', () => {
    const token = 'supersecrettoken123';
    const input = `Request with token ${token} and again ${token}`;
    expect(redactToken(input, token)).toBe('Request with token [REDACTED] and again [REDACTED]');
  });

  it('returns input unchanged when token is not present', () => {
    const input = 'No token here';
    expect(redactToken(input, 'missingtoken')).toBe(input);
  });

  it('returns input unchanged when token is undefined and no bearer-like token exists', () => {
    const input = 'Just a regular short string';
    expect(redactToken(input)).toBe(input);
  });

  it('redacts bearer-like tokens (50+ alphanumeric chars) when no token provided', () => {
    const longToken = 'a'.repeat(50);
    const input = `Bearer ${longToken}`;
    expect(redactToken(input)).toBe('Bearer [REDACTED]');
  });

  it('does not redact short alphanumeric strings with default pattern', () => {
    const input = 'short123';
    expect(redactToken(input)).toBe(input);
  });
});
