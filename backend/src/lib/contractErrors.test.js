import { describe, expect, it } from 'vitest';

import {
  REGISTRY_ERROR_CODES,
  AGENTS_ERROR_CODES,
  extractRegistryErrorCode,
  registryErrorFromCode,
  registryErrorFromHostError,
  agentsErrorFromCode,
  agentsErrorFromHostError,
} from './contractErrors.js';

describe('registry contract error mapping', () => {
  it('documents every registry contract error code', () => {
    expect(Object.keys(REGISTRY_ERROR_CODES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('maps numeric registry codes to API ContractError objects', () => {
    expect(registryErrorFromCode(3)).toMatchObject({
      name: 'ContractError',
      code: 'DUPLICATE_SERVICE',
      message: 'Active service with same provider and endpoint already exists',
      registryErrorCode: 3,
    });
  });

  it('maps the REGISTRY_NOT_INITIALIZED and REGISTRY_PAUSED codes', () => {
    const expected = [
      [12, 'REGISTRY_NOT_INITIALIZED', 'Registry contract has not been initialized'],
      [13, 'REGISTRY_PAUSED', 'Registry contract is paused'],
    ];

    for (const [code, codeStr, message] of expected) {
      expect(REGISTRY_ERROR_CODES[code]).toMatchObject({ code: codeStr, message });
      expect(registryErrorFromCode(code)).toMatchObject({
        name: 'ContractError',
        code: codeStr,
        message,
        registryErrorCode: code,
      });
    }
  });

  it('extracts registry codes from structured RPC payloads', () => {
    expect(extractRegistryErrorCode({ errorResult: { contractCode: 7 } })).toBe(7);
    expect(extractRegistryErrorCode({ diagnosticEvents: [{ errorCode: 8 }] })).toBe(8);
  });

  it('extracts registry codes from Soroban contract error strings without matching messages', () => {
    expect(extractRegistryErrorCode('HostError: Error(Contract, #4)')).toBe(4);
    expect(extractRegistryErrorCode('transaction failed with ContractError(6)')).toBe(6);
  });

  it('extracts the REGISTRY_NOT_INITIALIZED and REGISTRY_PAUSED codes from host errors', () => {
    expect(registryErrorFromHostError({ contractCode: 12 })).toMatchObject({
      code: 'REGISTRY_NOT_INITIALIZED',
      registryErrorCode: 12,
    });
    expect(registryErrorFromHostError({ contractCode: 13 })).toMatchObject({
      code: 'REGISTRY_PAUSED',
      registryErrorCode: 13,
    });
  });

  it('ignores unknown numeric codes', () => {
    expect(extractRegistryErrorCode({ contractCode: 999 })).toBeNull();
    expect(registryErrorFromHostError({ contractCode: 999 })).toBeNull();
  });
});

describe('agents contract error mapping', () => {
  it('documents every agents contract error code with stable numeric keys', () => {
    expect(Object.keys(AGENTS_ERROR_CODES).map(Number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('maps AgentNotFound (code 3) to 404 with stable code string', () => {
    expect(agentsErrorFromCode(3)).toMatchObject({
      name: 'ContractError',
      code: 'AGENT_NOT_FOUND',
      message: 'No agent is registered for this address',
      agentsErrorCode: 3,
      status: 404,
    });
  });

  it('maps AgentInactive (code 4) to 403 with stable code string', () => {
    expect(agentsErrorFromCode(4)).toMatchObject({
      name: 'ContractError',
      code: 'AGENT_INACTIVE',
      message: 'Agent has been deactivated',
      agentsErrorCode: 4,
      status: 403,
    });
  });

  it('maps AgentFlagged (code 5) to 403 with stable code string', () => {
    expect(agentsErrorFromCode(5)).toMatchObject({
      name: 'ContractError',
      code: 'AGENT_FLAGGED',
      message: 'Agent has been flagged and cannot earn a score',
      agentsErrorCode: 5,
      status: 403,
    });
  });

  it('maps all three get_score failure variants', () => {
    const expected = [
      [3, 'AGENT_NOT_FOUND', 'No agent is registered for this address', 404],
      [4, 'AGENT_INACTIVE', 'Agent has been deactivated', 403],
      [5, 'AGENT_FLAGGED', 'Agent has been flagged and cannot earn a score', 403],
    ];
    for (const [code, codeStr, message, status] of expected) {
      expect(agentsErrorFromCode(code)).toMatchObject({
        name: 'ContractError',
        code: codeStr,
        message,
        agentsErrorCode: code,
        status,
      });
    }
  });

  it('extracts agents error codes from HostError strings', () => {
    expect(agentsErrorFromHostError('HostError: Error(Contract, #3)')).toMatchObject({
      code: 'AGENT_NOT_FOUND',
      agentsErrorCode: 3,
      status: 404,
    });
    expect(agentsErrorFromHostError('HostError: Error(Contract, #4)')).toMatchObject({
      code: 'AGENT_INACTIVE',
      agentsErrorCode: 4,
      status: 403,
    });
    expect(agentsErrorFromHostError('HostError: Error(Contract, #5)')).toMatchObject({
      code: 'AGENT_FLAGGED',
      agentsErrorCode: 5,
      status: 403,
    });
  });

  it('extracts agents error codes from structured RPC payloads', () => {
    expect(agentsErrorFromHostError({ contractCode: 3 })).toMatchObject({
      code: 'AGENT_NOT_FOUND',
      agentsErrorCode: 3,
    });
    expect(agentsErrorFromHostError({ errorResult: { contractCode: 5 } })).toMatchObject({
      code: 'AGENT_FLAGGED',
      agentsErrorCode: 5,
    });
  });

  it('returns null for unknown agents error codes', () => {
    expect(agentsErrorFromCode(999)).toBeNull();
    expect(agentsErrorFromHostError({ contractCode: 999 })).toBeNull();
  });

  it('does not confuse agents codes with registry codes', () => {
    // Code 3 in registry = DUPLICATE_SERVICE; code 3 in agents = AGENT_NOT_FOUND.
    // They are separate maps and must never cross-contaminate.
    expect(registryErrorFromCode(3)).toMatchObject({ code: 'DUPLICATE_SERVICE' });
    expect(agentsErrorFromCode(3)).toMatchObject({ code: 'AGENT_NOT_FOUND' });
  });
});
