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
    const needsQuoting = /[:\n\r\t,"]/.test(str);
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

  // Helper to determine if an array represents uniform tabular objects
  function isUniformArray(arr: any[]): boolean {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    
    const firstItem = arr[0];
    if (firstItem === null || typeof firstItem !== 'object' || Array.isArray(firstItem)) {
      return false;
    }

    const firstKeys = Object.keys(firstItem);
    if (firstKeys.length === 0) return false;

    const firstKeysStr = JSON.stringify(firstKeys);

    for (let i = 1; i < arr.length; i++) {
      const item = arr[i];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
      if (JSON.stringify(Object.keys(item)) !== firstKeysStr) {
        return false;
      }
    }
    return true;
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

      if (isUniformArray(val)) {
        const keys = Object.keys(val[0]);
        const header = `${spaces}${keyName || 'root'}[${val.length}]{${keys.join(',')}}:`;
        
        const rows = val.map(item => {
          return keys.map(k => {
            const propVal = item[k];
            if (isPrimitive(propVal)) {
              return formatPrimitive(propVal);
            } else {
              // Safe fallback for nested complex structures inside tabular columns
              return JSON.stringify(propVal);
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
        if (isUniformArray(v)) {
          // Uniform nested array includes the property header natively
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
