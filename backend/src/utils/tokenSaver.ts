export interface TokenSaverConfig {
  maxDepth: number;
  maxArrayLength: number;
  maxCharCap: number;
  stripMetadataKeys: string[];
}

export const DEFAULT_TOKEN_SAVER_CONFIG: TokenSaverConfig = {
  maxDepth: 10,
  maxArrayLength: 50,
  maxCharCap: 50000,
  stripMetadataKeys: ['traceId', 'requestId', 'spanId', 'x-request-id', 'correlationId']
};

/**
 * Recursively prunes JSON payloads to clean metadata, enforce depth limits, and cap arrays.
 */
export function cleanAndPrune(
  val: any,
  config: TokenSaverConfig,
  currentDepth: number = 1
): any {
  if (val === null || val === undefined) {
    return undefined;
  }

  // If we reach beyond max depth, return the max depth reached indicator
  if (currentDepth > config.maxDepth) {
    if (typeof val === 'object') {
      return "[Max Depth Reached]";
    }
    return val;
  }

  // Handle Array
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return undefined; // Strip empty arrays
    }

    let sliced = val;
    let wasTruncated = false;
    if (val.length > config.maxArrayLength) {
      sliced = val.slice(0, config.maxArrayLength);
      wasTruncated = true;
    }

    const cleanedArray: any[] = [];
    for (const item of sliced) {
      const cleanedItem = cleanAndPrune(item, config, currentDepth);
      if (cleanedItem !== undefined) {
        cleanedArray.push(cleanedItem);
      }
    }

    if (wasTruncated) {
      cleanedArray.push({ _omni_gateway_truncated: true });
    }

    return cleanedArray.length > 0 ? cleanedArray : undefined;
  }

  // Handle Object
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) {
      return undefined; // Strip empty objects
    }

    const cleanedObj: Record<string, any> = {};
    let hasKeys = false;

    for (const key of keys) {
      // Check if key should be stripped
      const shouldStrip = config.stripMetadataKeys.some(
        (mKey) => mKey.toLowerCase() === key.toLowerCase()
      );
      if (shouldStrip) {
        continue;
      }

      const cleanedVal = cleanAndPrune(val[key], config, currentDepth + 1);
      if (cleanedVal !== undefined) {
        cleanedObj[key] = cleanedVal;
        hasKeys = true;
      }
    }

    return hasKeys ? cleanedObj : undefined;
  }

  // Primitive types
  return val;
}

/**
 * Entry utility that serializes the cleaned JSON structure and applies character capping constraints.
 */
export function applyTokenSaver(payload: any, config: TokenSaverConfig = DEFAULT_TOKEN_SAVER_CONFIG): string {
  if (payload === null || payload === undefined) {
    return "{}";
  }

  const pruned = cleanAndPrune(payload, config);
  if (pruned === undefined) {
    return "{}";
  }

  let serialized = JSON.stringify(pruned);
  if (serialized.length > config.maxCharCap) {
    const warning = `\n\n[WARNING: Response truncated to ${config.maxCharCap} characters by Omni MCP Gateway to protect context window]`;
    const sliceLen = Math.max(0, config.maxCharCap - warning.length);
    serialized = serialized.substring(0, sliceLen) + warning;
  }

  return serialized;
}
