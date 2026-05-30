const express = require('express');
const cors = require('cors');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// In-memory mock database
let items = [];

// Populate bloated mock items list for testing Token-Saver array cap (60 elements)
for (let i = 1; i <= 60; i++) {
  items.push({
    id: i,
    name: `Bloated Dummy Item #${i}`,
    tags: ['dummy', 'test', 'item'],
    // Test recursive pruning
    metadata: {
      traceId: `trace-dummy-12345-${i}`,
      emptyArrayTest: [],
      nullTest: null,
      nestedTest: {
        level2: {
          level3: {
            level4: {
              level5: {
                message: 'This object is at depth 6 and should be truncated by Token-Saver!'
              }
            }
          }
        }
      }
    }
  });
}

// 1. Expose the OpenAPI 3.0.0 JSON Specification
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Dummy Testing API',
      version: '1.0.0',
      description: 'A mock REST service built to test Omni MCP Gateway features.'
    },
    servers: [
      {
        url: `http://localhost:${port}`
      }
    ],
    paths: {
      '/items': {
        get: {
          summary: 'Fetch Items List',
          description: 'Fetches the full bloated list of items to test Token-Saver recursion, array capping, and trace key pruning.',
          responses: {
            200: {
              description: 'Successful Response'
            }
          }
        },
        post: {
          summary: 'Create New Item',
          description: 'Creates a new item. Simulates secure credentials, requiring a Authorization header Bearer token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Item Created'
            }
          }
        }
      },
      '/items/{id}': {
        delete: {
          summary: 'Delete Item',
          description: 'Simulates a mutating action, deleting a specific item.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' }
            }
          ],
          responses: {
            200: {
              description: 'Item Deleted'
            }
          }
        }
      },
      '/items/bulk': {
        post: {
          summary: 'Create Bulk Items',
          description: 'Creates multiple items at once. Expects a complicated nested structure.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    batchName: { type: 'string' },
                    options: {
                      type: 'object',
                      properties: {
                        dryRun: { type: 'boolean' },
                        tags: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      },
                      required: ['dryRun']
                    },
                    records: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          value: { type: 'number' }
                        },
                        required: ['name']
                      }
                    }
                  },
                  required: ['batchName', 'options', 'records']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Bulk Items Created'
            }
          }
        }
      }
    }
  });
});

// Helper auth middleware checking header token
function checkToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer mock_api_key_123') {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid simulated REST token.' });
  }
  next();
}

// 2. GET /items (Exposes Bloated List)
app.get('/items', (req, res) => {
  console.log(`[Dummy API] GET /items called`);
  res.json({
    status: 'success',
    totalCount: items.length,
    emptyMetadataList: [], // tests empty array stripping
    diagnosticPayload: {
      traceId: 'span-x-998877', // tests trace stripping
      requestId: 'req-uuid-992211'
    },
    data: items
  });
});

// 3. POST /items (Authenticated Mutating Route)
app.post('/items', checkToken, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name parameter.' });
  }
  const newItem = {
    id: items.length + 1,
    name,
    tags: ['created'],
    metadata: {
      traceId: 'trace-new-item',
      emptyArrayTest: [],
      nullTest: null
    }
  };
  items.unshift(newItem);
  console.log(`[Dummy API] POST /items success: Added "${name}"`);
  res.status(201).json(newItem);
});

// 4. DELETE /items/:id (Authenticated Mutating Route)
app.delete('/items/:id', checkToken, (req, res) => {
  const id = parseInt(req.params.id);
  items = items.filter(item => item.id !== id);
  console.log(`[Dummy API] DELETE /items/${id} called`);
  res.json({ status: 'success', message: `Item #${id} deleted.` });
});

// 5. POST /items/bulk (Complex Nested Body Route)
app.post('/items/bulk', checkToken, (req, res) => {
  const { batchName, options, records } = req.body;
  if (!batchName || !options || !records) {
    return res.status(400).json({ error: 'Missing batchName, options, or records parameters.' });
  }
  console.log(`[Dummy API] POST /items/bulk batch "${batchName}" dryRun: ${options.dryRun}`);
  res.status(201).json({
    status: 'success',
    batchName,
    processedCount: records.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Dummy Testing REST API is active at http://localhost:${port}`);
  console.log(`Swagger OpenAPI spec available at http://localhost:${port}/openapi.json`);
});
