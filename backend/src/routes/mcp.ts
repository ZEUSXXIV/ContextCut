import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ConnectedAPI } from '../models/ConnectedAPI';
import { EncryptedSecret } from '../models/EncryptedSecret';
import { convertSpecToMCPTools, getToolName } from '../utils/openapiParser';
import { decrypt } from '../utils/cryptography';
import { applyTokenSaver } from '../utils/tokenSaver';

const router = Router();

// Store active Server-Sent Events (SSE) client response streams in memory keyed by session ID
const sseSessions = new Map<string, Response>();

/**
 * @route   GET /api/mcp/sse
 * @desc    Establishes a Server-Sent Events (SSE) stream connection with the MCP client.
 *          Generates a unique session ID and issues the standard client-to-server POST endpoint.
 */
router.get('/sse', authenticateApiKey as any, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Tenant context missing.' });
    return;
  }

  // Set standard SSE streaming headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for reverse proxies like Nginx
  });

  // Keep connection alive with periodic heartbeats
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Generate unique session ID for client interactions
  const sessionId = crypto.randomBytes(16).toString('hex');
  sseSessions.set(sessionId, res);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseSessions.delete(sessionId);
    console.log(`MCP SSE session ${sessionId} closed and removed.`);
  });

  // Standard MCP SSE initialization event - tells client where to send POST messages
  const messageUrl = `${req.protocol}://${req.get('host')}/api/mcp/message?sessionId=${sessionId}&apiKey=${req.user.apiKey}`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);
  console.log(`MCP SSE session ${sessionId} initialized for user ${req.user.email}`);
});

/**
 * @route   POST /api/mcp/message
 * @desc    Receives incoming JSON-RPC 2.0 requests from the MCP client.
 *          Routes and handles MCP capabilities (initialize, tools/list, tools/call).
 *          Relays responses asynchronously over the established SSE response stream.
 */
router.post('/message', authenticateApiKey as any, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId query parameter.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Retrieve corresponding SSE response connection stream
    const clientStream = sseSessions.get(sessionId);
    if (!clientStream) {
      res.status(400).json({ error: 'Session has expired or connection is closed.' });
      return;
    }

    const { jsonrpc, id, method, params } = req.body;

    if (jsonrpc !== '2.0') {
      res.status(400).json({ error: 'Invalid JSON-RPC request format.' });
      return;
    }

    // Handle JSON-RPC 2.0 Notifications (requests without an ID member)
    // The server MUST NOT reply or send any response through the SSE stream for notifications
    if (id === undefined || id === null) {
      res.status(200).json({ status: 'ignored_notification' });
      return;
    }

    let jsonRpcResponse: any = { jsonrpc: '2.0', id };

    try {
      if (method === 'initialize') {
        // Standard MCP initialization handshake response
        jsonRpcResponse.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'Omni MCP Gateway',
            version: '1.0.0',
          },
        };
      } else if (method === 'tools/list') {
        // Fetch all registered Connected APIs for the tenant
        const apis = await ConnectedAPI.find({ user: req.user._id });
        const allTools: any[] = [];

        for (const api of apis) {
          const tools = convertSpecToMCPTools(api.rawSpec, api.allowedPaths);
          allTools.push(...tools);
        }

        jsonRpcResponse.result = {
          tools: allTools,
        };
      } else if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        if (!name) {
          jsonRpcResponse.error = { code: -32602, message: 'Invalid params: name is required.' };
        } else {
          // Resolve tool name to specific ConnectedAPI and path configuration
          const apis = await ConnectedAPI.find({ user: req.user._id });
          let matchedApi: any = null;
          let matchedPathConfig: any = null;

          for (const api of apis) {
            for (const config of api.allowedPaths) {
              const toolName = getToolName(config.method, config.path);
              if (toolName === name) {
                matchedApi = api;
                matchedPathConfig = config;
                break;
              }
            }
            if (matchedApi) break;
          }

          if (!matchedApi || !matchedPathConfig) {
            jsonRpcResponse.error = { code: -32601, message: `Tool not found: ${name}` };
          } else {
            // Security Baseline Enforcement: Block disabled paths or non-writable mutating methods
            if (!matchedPathConfig.isEnabled) {
              jsonRpcResponse.result = {
                content: [{ type: 'text', text: `Error: Tool '${name}' is disabled in configuration.` }],
                isError: true,
              };
            } else if (matchedPathConfig.method !== 'get' && !matchedPathConfig.isWritable) {
              jsonRpcResponse.result = {
                content: [{ type: 'text', text: `Security Error: Mutation '${name}' is read-only and blocked.` }],
                isError: true,
              };
            } else {
              // Retrieve and decrypt auth secret for third-party REST API
              const secret = await EncryptedSecret.findOne({ connectedApi: matchedApi._id });
              const headers: Record<string, string> = {};

              if (secret) {
                try {
                  const decryptedToken = decrypt(secret.encryptedData, secret.iv, secret.tag);
                  const keyName = (secret as any).keyName || 'Authorization';
                  if (keyName.toLowerCase() === 'authorization') {
                    headers[keyName] = `Bearer ${decryptedToken}`;
                  } else {
                    headers[keyName] = decryptedToken;
                  }
                } catch (cryptoErr: any) {
                  console.error('Decryption failed for secret:', cryptoErr);
                  const keyName = (secret as any).keyName || 'Authorization';
                  headers[keyName] = ''; // Send empty authorization or keep clean
                }
              }

              // Retrieve static custom headers from ConnectedAPI configuration
              const staticHeaders = matchedApi.customHeaders || {};

              // Extract and prepare URL base from server definitions or spec URL origin
              const spec = matchedApi.rawSpec;
              let baseUrl = 'http://localhost';
              try {
                if (spec.servers && spec.servers[0] && spec.servers[0].url) {
                  baseUrl = spec.servers[0].url;
                } else if (matchedApi.specUrl && matchedApi.specUrl.startsWith('http')) {
                  baseUrl = new URL(matchedApi.specUrl).origin;
                }
              } catch (urlErr) {
                console.error('Failed to parse specUrl origin:', urlErr);
              }

              // Categorize and extract parameters
              const operation = spec.paths[matchedPathConfig.path]?.[matchedPathConfig.method];
              const pathParams = new Set<string>();
              const queryParams = new Set<string>();
              const bodyParams = new Set<string>();

              if (operation) {
                if (operation.parameters && Array.isArray(operation.parameters)) {
                  for (const p of operation.parameters) {
                    if (p.in === 'path') pathParams.add(p.name);
                    if (p.in === 'query') queryParams.add(p.name);
                  }
                }
                if (operation.requestBody && operation.requestBody.content) {
                  const jsonContent = operation.requestBody.content['application/json'];
                  if (jsonContent && jsonContent.schema && jsonContent.schema.properties) {
                    for (const key of Object.keys(jsonContent.schema.properties)) {
                      bodyParams.add(key);
                    }
                  }
                }
              }

              let resolvedPath = matchedPathConfig.path;
              const queryArgs: Record<string, any> = {};
              const bodyArgs: Record<string, any> = {};

              // Dynamically distribute arguments passed from LLM client
              const toolArgs = args || {};
              for (const key of Object.keys(toolArgs)) {
                if (pathParams.has(key)) {
                  resolvedPath = resolvedPath.replace(`{${key}}`, String(toolArgs[key]));
                } else if (queryParams.has(key)) {
                  queryArgs[key] = toolArgs[key];
                } else if (bodyParams.has(key)) {
                  bodyArgs[key] = toolArgs[key];
                } else {
                  // Fallback heuristics: GET uses query parameters, others use body payload
                  if (matchedPathConfig.method === 'get') {
                    queryArgs[key] = toolArgs[key];
                  } else {
                    bodyArgs[key] = toolArgs[key];
                  }
                }
              }

              // Execute call to third-party rest API
              const fullUrl = `${baseUrl.replace(/\/$/, '')}/${resolvedPath.replace(/^\//, '')}`;
              console.log(`MCP Gateway proxying [${matchedPathConfig.method.toUpperCase()}] to ${fullUrl}`);

              try {
                const response = await axios({
                  method: matchedPathConfig.method,
                  url: fullUrl,
                  params: queryArgs,
                  data: Object.keys(bodyArgs).length > 0 ? bodyArgs : undefined,
                  headers: {
                    ...headers,
                    ...staticHeaders,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  timeout: 15000,
                  validateStatus: () => true, // Resolve all HTTP statuses safely
                });

                // Apply Token-Saver optimization recursive layer to response body
                const optimizedResponse = applyTokenSaver(response.data, matchedApi.tokenSaverConfig);

                jsonRpcResponse.result = {
                  content: [{ type: 'text', text: optimizedResponse }],
                  isError: response.status >= 400,
                };
              } catch (httpErr: any) {
                console.error('Proxied REST request failed:', httpErr);
                jsonRpcResponse.result = {
                  content: [{ type: 'text', text: `HTTP connection failed: ${httpErr.message || httpErr}` }],
                  isError: true,
                };
              }
            }
          }
        }
      } else {
        // Method not found handler
        jsonRpcResponse.error = { code: -32601, message: `Method not found: ${method}` };
      }
    } catch (err: any) {
      console.error('Error handling JSON-RPC message:', err);
      jsonRpcResponse.error = { code: -32603, message: `Internal server error: ${err.message}` };
    }

    // Write back standard JSON-RPC 2.0 response through the SSE stream connection
    clientStream.write(`event: message\ndata: ${JSON.stringify(jsonRpcResponse)}\n\n`);
    res.status(200).json({ status: 'sent' });
  } catch (error: any) {
    console.error('Message routing error:', error);
    res.status(500).json({ error: 'Internal Server Error during message routing.' });
  }
});

export default router;
