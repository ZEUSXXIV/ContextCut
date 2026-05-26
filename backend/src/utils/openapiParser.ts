import axios from 'axios';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface PathConfig {
  path: string;
  method: string;
  isEnabled: boolean;
  isWritable: boolean;
}

/**
 * Fetches and validates a public OpenAPI spec (JSON/YAML supported via JSON parser, assumes JSON response for now)
 */
export async function fetchAndValidateOpenAPI(url: string): Promise<any> {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const spec = response.data;
    if (!spec || (typeof spec !== 'object')) {
      throw new Error('Response is not a valid JSON object.');
    }
    if (!spec.openapi && !spec.swagger) {
      throw new Error('Missing openapi or swagger definition version.');
    }
    if (!spec.paths) {
      throw new Error('Missing paths object.');
    }
    return spec;
  } catch (error: any) {
    throw new Error(`Failed to fetch or validate OpenAPI spec: ${error.message}`);
  }
}

/**
 * Generates an MCP-compliant tool name: lowercases and replaces non-alphanumeric chars with underscores.
 */
export function getToolName(method: string, path: string): string {
  const sanitized = `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return sanitized
    .replace(/__+/g, '_')      // replace multiple underscores with single
    .replace(/_$/, '')         // remove trailing underscore
    .replace(/^_+/, '');       // remove leading underscore
}

/**
 * Reads OpenAPI specification and yields full default path configurations.
 * Enforces GET requests as read-only by default, and others as mutating.
 */
export function getAvailablePathsFromSpec(spec: any): PathConfig[] {
  const paths: PathConfig[] = [];
  if (!spec || !spec.paths) return [];

  for (const pathKey of Object.keys(spec.paths)) {
    const pathItem = spec.paths[pathKey];
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of Object.keys(pathItem)) {
      const lowerMethod = method.toLowerCase();
      if (['get', 'post', 'put', 'delete', 'patch'].includes(lowerMethod)) {
        const isGet = lowerMethod === 'get';
        paths.push({
          path: pathKey,
          method: lowerMethod,
          isEnabled: true,
          isWritable: !isGet // GET is read-only (isWritable=false), others default to writable but can be customized
        });
      }
    }
  }
  return paths;
}

/**
 * Flat-maps OpenAPI path, query, and requestBody parameters to standard tool schemas.
 */
export function buildToolInputSchema(operation: any): any {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Parse path and query parameters
  if (operation.parameters && Array.isArray(operation.parameters)) {
    for (const param of operation.parameters) {
      if (!param || typeof param !== 'object' || param.$ref) {
        continue;
      }
      const name = param.name;
      const desc = param.description || '';
      const schema = param.schema || { type: 'string' };

      properties[name] = {
        ...schema,
        description: `[${param.in === 'path' ? 'Path' : 'Query'} Param] ${desc}`.trim()
      };

      if (param.required) {
        required.push(name);
      }
    }
  }

  // Parse JSON requestBody properties to flatten payload parameters
  if (operation.requestBody && typeof operation.requestBody === 'object') {
    const content = operation.requestBody.content || {};
    const jsonContent = content['application/json'];
    if (jsonContent && jsonContent.schema && typeof jsonContent.schema === 'object') {
      const bodySchema = jsonContent.schema;
      if (bodySchema.type === 'object' && bodySchema.properties) {
        for (const bodyKey of Object.keys(bodySchema.properties)) {
          const propSchema = bodySchema.properties[bodyKey];
          properties[bodyKey] = {
            ...propSchema,
            description: `[Body Param] ${propSchema.description || ''}`.trim()
          };
        }
        if (Array.isArray(bodySchema.required)) {
          required.push(...bodySchema.required);
        }
      } else {
        properties['requestBody'] = {
          ...bodySchema,
          description: '[Body Payload Object/Array]'
        };
        if (operation.requestBody.required) {
          required.push('requestBody');
        }
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? Array.from(new Set(required)) : undefined
  };
}

/**
 * Validates specifications and filters active path definitions to emit standard MCP-compliant schemas.
 */
export function convertSpecToMCPTools(spec: any, pathConfigs: PathConfig[]): MCPTool[] {
  const tools: MCPTool[] = [];
  if (!spec || !spec.paths) return [];

  for (const config of pathConfigs) {
    if (!config.isEnabled) continue;

    // Security Baseline Enforcement:
    // If it's a mutating action (not GET) but NOT writable, block conversion entirely.
    if (config.method !== 'get' && !config.isWritable) {
      continue;
    }

    const pathItem = spec.paths[config.path];
    if (!pathItem) continue;

    const operation = pathItem[config.method];
    if (!operation) continue;

    const toolName = getToolName(config.method, config.path);
    const description = operation.summary || operation.description || `Execute ${config.method.toUpperCase()} ${config.path}`;
    const inputSchema = buildToolInputSchema(operation);

    tools.push({
      name: toolName,
      description,
      inputSchema
    });
  }

  return tools;
}
