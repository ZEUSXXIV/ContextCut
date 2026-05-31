/**
 * Tabular Object-Oriented Notation (TOON) Encoder Utility
 * Designed to compress standard JSON representations for LLM prompt context conservation.
 */

/**
 * Recursively traverses an arbitrary JSON/JavaScript value and converts it into a TOON string.
 *
 * @param jsonInput The raw or optimized JSON data object.
 * @returns The custom formatted TOON string.
 */
export function convertToToon(jsonInput: any): string {
  // Helper to check if a value is primitive
  function isPrimitive(val: any): boolean {
    return val === null || typeof val !== 'object';
  }

  // Helper to format string values according to YAML quoting rules
  function formatString(str: string): string {
    const needsQuoting = /[|:\n\r\t,"]/.test(str);
    if (needsQuoting) {
      // Escape backslashes, double quotes, and control characters inside the string representation
      const escaped = str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }
    return str;
  }

  // Helper to convert individual primitive values, including shortcuts
  function formatPrimitive(val: any): string {
    if (val === true) return 'T';
    if (val === false) return 'F';
    if (val === null || val === undefined) return 'N';
    if (typeof val === 'string') return formatString(val);
    return String(val);
  }

  // Helper to serialize any nested structure in a highly compact, single-line format
  function serializeCompact(val: any): string {
    if (isPrimitive(val)) {
      return formatPrimitive(val);
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      const items = val.map(item => serializeCompact(item)).join('|');
      return `[${items}]`;
    }

    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const pairs = keys.map(k => {
      const v = val[k];
      return `${k}:${serializeCompact(v)}`;
    }).join('|');
    return `[${pairs}]`;
  }

  // Helper to determine if an array represents tabular objects (i.e. every item is a non-null object and not an array)
  function isTabularArray(arr: any[]): boolean {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    
    for (const item of arr) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
    }
    return true;
  }

  // Gather unique union of all keys across all objects in a tabular array
  function getUnionOfKeys(arr: any[]): string[] {
    const keysSet = new Set<string>();
    for (const item of arr) {
      for (const k of Object.keys(item)) {
        keysSet.add(k);
      }
    }
    return Array.from(keysSet);
  }

  // Recursive serialization routine
  function serialize(val: any, keyName: string = '', indent: number = 0): string {
    const spaces = ' '.repeat(indent);

    if (isPrimitive(val)) {
      return formatPrimitive(val);
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        return '[]';
      }

      if (isTabularArray(val)) {
        const keys = getUnionOfKeys(val);
        if (keys.length === 0) {
          return `${spaces}${JSON.stringify(val)}`;
        }
        const header = `${spaces}${keyName || 'root'}[${val.length}]{${keys.join(',')}}:`;
        
        const rows = val.map(item => {
          return keys.map(k => {
            const propVal = item[k];
            if (isPrimitive(propVal)) {
              return formatPrimitive(propVal);
            } else {
              // Compact serialization for nested complex structures inside tabular columns
              return serializeCompact(propVal);
            }
          }).join(',');
        });

        const rowSpaces = ' '.repeat(indent + 2);
        return `${header}\n` + rows.map(r => `${rowSpaces}${r}`).join('\n');
      } else {
        // Fall back safely to standard compact JSON representation for irregular arrays
        return `${spaces}${JSON.stringify(val)}`;
      }
    }

    // Standard JavaScript Object
    const keys = Object.keys(val);
    if (keys.length === 0) {
      return '{}';
    }

    const lines: string[] = [];
    for (const k of keys) {
      const v = val[k];
      if (isPrimitive(v)) {
        lines.push(`${spaces}${k}: ${formatPrimitive(v)}`);
      } else if (Array.isArray(v)) {
        if (isTabularArray(v)) {
          // Tabular nested array includes the property header natively
          lines.push(serialize(v, k, indent));
        } else {
          // Safe compact JSON fallback
          lines.push(`${spaces}${k}: ${JSON.stringify(v)}`);
        }
      } else {
        // Nested Object representation
        lines.push(`${spaces}${k}:`);
        lines.push(serialize(v, k, indent + 2));
      }
    }

    return lines.join('\n');
  }

  return serialize(jsonInput);
}
