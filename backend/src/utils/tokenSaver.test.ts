import { cleanAndPrune, applyTokenSaver, TokenSaverConfig } from './tokenSaver';

describe('Token-Saver Utility', () => {
  const config: TokenSaverConfig = {
    maxDepth: 4,
    maxArrayLength: 5,
    maxCharCap: 100,
    stripMetadataKeys: ['traceId', 'requestId', 'spanId']
  };

  test('should strip metadata keys matching stripMetadataKeys config', () => {
    const input = {
      id: 1,
      traceId: 'trace-123',
      requestId: 'req-456',
      spanId: 'span-789',
      data: 'info'
    };
    const result = cleanAndPrune(input, config);
    expect(result).toEqual({ id: 1, data: 'info' });
    expect(result.traceId).toBeUndefined();
    expect(result.requestId).toBeUndefined();
    expect(result.spanId).toBeUndefined();
  });

  test('should prune empty arrays and objects', () => {
    const input = {
      emptyArr: [],
      emptyObj: {},
      valid: 'data'
    };
    const result = cleanAndPrune(input, config);
    expect(result).toEqual({ valid: 'data' });
  });

  test('should cap array elements and inject truncation marker', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = cleanAndPrune(input, config);
    expect(result).toHaveLength(6); // 5 elements + 1 truncation marker
    expect(result[5]).toEqual({ _omni_gateway_truncated: true });
  });

  test('should recursively prune nested objects exceeding max depth of 4', () => {
    const input = {
      level2: {
        level3: {
          level4: {
            level5: {
              data: 'hidden'
            }
          }
        }
      }
    };

    const result = cleanAndPrune(input, config);
    expect(result.level2.level3.level4.level5).toEqual('[Max Depth Reached]');
  });

  test('should apply character capping and append warning snippet', () => {
    const input = {
      message: 'This is a very long message that will definitely exceed the limit of 100 characters in the final string representation.'
    };
    const result = applyTokenSaver(input, config);
    expect(result.length).toBeLessThanOrEqual(config.maxCharCap);
    expect(result).toContain('[WARNING: Response truncated to 100 characters');
  });
});
