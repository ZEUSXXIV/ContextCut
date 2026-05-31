/**
 * Tabular Object-Oriented Notation (TOON) Encoder Utility
 * Adaptation of the backend encoder for frontend use.
 */

export function convertToToon(jsonInput: any): string {
  function isPrimitive(val: any): boolean {
    return val === null || typeof val !== 'object';
  }

  function formatString(str: string): string {
    const needsQuoting = /[|:\n\r\t,"]/.test(str);
    if (needsQuoting) {
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

  function formatPrimitive(val: any): string {
    if (val === true) return 'T';
    if (val === false) return 'F';
    if (val === null || val === undefined) return 'N';
    if (typeof val === 'string') return formatString(val);
    return String(val);
  }

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

  function isTabularArray(arr: any[]): boolean {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    
    for (const item of arr) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
    }
    return true;
  }

  function getUnionOfKeys(arr: any[]): string[] {
    const keysSet = new Set<string>();
    for (const item of arr) {
      for (const k of Object.keys(item)) {
        keysSet.add(k);
      }
    }
    return Array.from(keysSet);
  }

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
              return serializeCompact(propVal);
            }
          }).join(',');
        });

        const rowSpaces = ' '.repeat(indent + 2);
        return `${header}\n` + rows.map(r => `${rowSpaces}${r}`).join('\n');
      } else {
        return `${spaces}${JSON.stringify(val)}`;
      }
    }

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
          lines.push(serialize(v, k, indent));
        } else {
          lines.push(`${spaces}${k}: ${JSON.stringify(v)}`);
        }
      } else {
        lines.push(`${spaces}${k}:`);
        lines.push(serialize(v, k, indent + 2));
      }
    }

    return lines.join('\n');
  }

  return serialize(jsonInput);
}
