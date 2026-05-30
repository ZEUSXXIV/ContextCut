export function tokenizeShell(cmd: string): string[] {
  const args: string[] = [];
  let current = '';
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let escaped = false;

  // Replace escaped line continuations
  const normalizedCmd = cmd.replace(/\\\r?\n/g, ' ');

  for (let i = 0; i < normalizedCmd.length; i++) {
    const char = normalizedCmd[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuotes) {
      escaped = true;
      continue;
    }

    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    if ((char === ' ' || char === '\t') && !inDoubleQuotes && !inSingleQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

export interface ParsedCurl {
  url: string;
  baseUrl: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Array<{
    name: string;
    in: 'query';
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    example?: string;
  }>;
  bodyParameters: Array<{
    name: string;
    in: 'body';
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    example?: string;
  }>;
  pathParameters: Array<{
    name: string;
    in: 'path';
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    example?: string;
  }>;
  credentialKeyName?: string;
  credentialValue?: string;
}

export function parseCurl(curlCommand: string): ParsedCurl | null {
  const tokens = tokenizeShell(curlCommand.trim());
  if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
    return null;
  }

  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let bodyStr = '';

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      const val = tokens[++i];
      if (val) method = val.toUpperCase();
    } else if (token === '-H' || token === '--header') {
      const val = tokens[++i];
      if (val) {
        const colonIdx = val.indexOf(':');
        if (colonIdx !== -1) {
          const key = val.substring(0, colonIdx).trim();
          const value = val.substring(colonIdx + 1).trim();
          headers[key] = value;
        }
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      const val = tokens[++i];
      if (val) bodyStr = val;
    } else if (token === '--url') {
      const val = tokens[++i];
      if (val) url = val;
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token;
    }
  }

  if (!url) {
    return null;
  }

  // Parse URL base, path, and queries
  let baseUrl = '';
  let path = '';
  const queryParams: ParsedCurl['queryParams'] = [];
  const pathParameters: ParsedCurl['pathParameters'] = [];

  try {
    const parsedUrl = new URL(url);
    baseUrl = parsedUrl.protocol + '//' + parsedUrl.host;
    path = parsedUrl.pathname;

    parsedUrl.searchParams.forEach((value, key) => {
      // Infer type
      let type: 'string' | 'number' | 'boolean' = 'string';
      if (value === 'true' || value === 'false') type = 'boolean';
      else if (!isNaN(Number(value)) && value.trim() !== '') type = 'number';

      queryParams.push({
        name: key,
        in: 'query',
        type,
        required: true,
        description: `Query parameter parsed from cURL.`,
        example: value
      });
    });

    // Detect path parameters if there are bracket/brace placeholders in the path (e.g. {id} or :id)
    const segments = path.split('/');
    segments.forEach((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        const name = segment.slice(1, -1);
        pathParameters.push({
          name,
          in: 'path',
          type: 'string',
          required: true,
          description: 'Path parameter.'
        });
      } else if (segment.startsWith(':')) {
        const name = segment.slice(1);
        pathParameters.push({
          name,
          in: 'path',
          type: 'string',
          required: true,
          description: 'Path parameter.'
        });
      }
    });
  } catch (err) {
    // Fallback if URL is incomplete
    baseUrl = url;
    path = '/';
  }

  // Parse request body and infer types
  const bodyParameters: ParsedCurl['bodyParameters'] = [];
  if (bodyStr) {
    try {
      const parsedBody = JSON.parse(bodyStr);
      if (parsedBody && typeof parsedBody === 'object') {
        Object.keys(parsedBody).forEach((key) => {
          const value = parsedBody[key];
          let type: 'string' | 'number' | 'boolean' = 'string';
          if (typeof value === 'number') type = 'number';
          else if (typeof value === 'boolean') type = 'boolean';

          bodyParameters.push({
            name: key,
            in: 'body',
            type,
            required: true,
            description: `Request body key parsed from cURL.`,
            example: typeof value === 'object' ? JSON.stringify(value) : String(value)
          });
        });
        // If method is GET but there is a body, usually it should be a write method (POST/PUT/PATCH)
        if (method === 'GET') {
          method = 'POST';
        }
      }
    } catch (e) {
      // Non-JSON body, treat as a single raw body string parameter
      bodyParameters.push({
        name: 'body',
        in: 'body',
        type: 'string',
        required: true,
        description: 'Raw body string parsed from cURL.',
        example: bodyStr
      });
    }
  }

  // Parse security headers into secure credentials fields
  let credentialKeyName: string | undefined;
  let credentialValue: string | undefined;

  const authHeaderKeys = Object.keys(headers).filter(
    (k) => k.toLowerCase() === 'authorization' || k.toLowerCase() === 'x-api-key' || k.toLowerCase() === 'apikey'
  );

  if (authHeaderKeys.length > 0) {
    const matchedKey = authHeaderKeys[0];
    credentialKeyName = matchedKey;
    credentialValue = headers[matchedKey];
  }

  return {
    url,
    baseUrl,
    path,
    method,
    headers,
    queryParams,
    bodyParameters,
    pathParameters,
    credentialKeyName,
    credentialValue
  };
}
