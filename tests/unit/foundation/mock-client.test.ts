import { describe, it, expect, beforeEach } from 'vitest';
import { MockFoundationMcpClient } from '../../../src/foundation/mock-client.js';

describe('MockFoundationMcpClient', () => {
  let client: MockFoundationMcpClient;

  beforeEach(() => {
    client = new MockFoundationMcpClient();
  });

  describe('fetchMenu', () => {
    it('returns epics and project_specifics', async () => {
      const result = await client.fetchMenu();
      expect(result).toEqual(['epics', 'project_specifics']);
    });
  });
});