import { Router, Response, Request } from 'express';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ConnectedAPI } from '../models/ConnectedAPI';
import { EncryptedSecret } from '../models/EncryptedSecret';
import { fetchAndValidateOpenAPI, getAvailablePathsFromSpec } from '../utils/openapiParser';
import { encrypt } from '../utils/cryptography';
import { RequestTrace } from '../models/RequestTrace';
import { getToolName } from '../utils/openapiParser';
import crypto from 'crypto';
import { convertToToon } from '../utils/toonEncoder';

const router = Router();

/**
 * @route   POST /api/gateways/validate
 * @desc    Validates an OpenAPI specification URL and parses its paths (Unauthenticated for frontend validation convenience)
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'OpenAPI Spec URL is required.' });
      return;
    }
    const spec = await fetchAndValidateOpenAPI(url);
    const paths = getAvailablePathsFromSpec(spec);
    res.status(200).json({ spec, paths });
  } catch (err: any) {
    console.error('Validation error:', err);
    res.status(400).json({ error: `Validation failed: ${err.message}` });
  }
});

// Apply authorization middleware to all CRUD endpoints in this router
router.use(authenticateApiKey as any);

/**
 * @route   POST /api/apis
 * @desc    Creates a new Connected API, parses its OpenAPI spec, sets default paths, and encrypts its secret key if provided
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const name = req.body.name;
    const isManual = req.body.isManual === true;
    const specUrl = req.body.specUrl || req.body.openApiUrl;
    const token = req.body.token || req.body.credentialValue;
    const frontendPaths = req.body.paths || req.body.allowedPaths;
    const credentialKeyName = req.body.credentialKeyName || 'Authorization';
    const customHeaders = req.body.customHeaders || {};

    if (!name || (!isManual && !specUrl)) {
      res.status(400).json({ error: 'Name and OpenAPI Spec URL are required.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing.' });
      return;
    }

    // Check if an API with the same name already exists for this user
    const existingApi = await ConnectedAPI.findOne({ user: req.user._id, name });
    if (existingApi) {
      res.status(400).json({ error: 'A Connected API with this name already exists.' });
      return;
    }

    // Fetch and validate the OpenAPI specification
    let rawSpec: any;
    if (isManual) {
      rawSpec = req.body.rawSpec;
      if (!rawSpec || typeof rawSpec !== 'object') {
        res.status(400).json({ error: 'Valid rawSpec object is required for manually designed APIs.' });
        return;
      }
      if (!rawSpec.openapi && !rawSpec.swagger) {
        res.status(400).json({ error: 'Manually designed API spec must contain an openapi or swagger definition version.' });
        return;
      }
      if (!rawSpec.paths) {
        res.status(400).json({ error: 'Manually designed API spec must contain a paths object.' });
        return;
      }
    } else {
      try {
        rawSpec = await fetchAndValidateOpenAPI(specUrl);
      } catch (err: any) {
        res.status(400).json({ error: `OpenAPI spec loading error: ${err.message}` });
        return;
      }
    }

    const finalSpecUrl = specUrl || (rawSpec.servers?.[0]?.url) || 'manual';

    // Build paths configurations (use frontend configurations if provided, otherwise default specs)
    let allowedPaths = [];
    if (frontendPaths && Array.isArray(frontendPaths)) {
      allowedPaths = frontendPaths.map((p: any) => ({
        path: p.path,
        method: p.method,
        isEnabled: typeof p.isEnabled === 'boolean' ? p.isEnabled : true,
        isWritable: typeof p.isWritable === 'boolean' ? p.isWritable : false,
      }));
    } else {
      allowedPaths = getAvailablePathsFromSpec(rawSpec);
    }

    // Create the Connected API configuration document
    const connectedApi = new ConnectedAPI({
      user: req.user._id,
      name,
      specUrl: finalSpecUrl,
      rawSpec,
      allowedPaths,
      customHeaders,
      enableToonCompression: req.body.enableToonCompression === true,
    });

    await connectedApi.save();

    // If a third-party token is provided, encrypt it and store it in EncryptedSecret
    if (token && typeof token === 'string' && token.trim().length > 0) {
      const { encryptedData, iv, tag } = encrypt(token.trim());
      const secret = new EncryptedSecret({
        connectedApi: connectedApi._id,
        encryptedData,
        iv,
        tag,
        keyName: credentialKeyName,
      });
      await secret.save();
    }

    res.status(201).json({
      message: 'Connected API successfully registered and parsed.',
      connectedApi,
    });
  } catch (error: any) {
    console.error('Create API error:', error);
    res.status(500).json({ error: 'Internal Server Error while creating Connected API.' });
  }
});

/**
 * @route   GET /api/apis
 * @desc    Lists all Connected APIs owned by the authenticated tenant
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const apis = await ConnectedAPI.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(apis);
  } catch (error: any) {
    console.error('List APIs error:', error);
    res.status(500).json({ error: 'Internal Server Error while retrieving APIs.' });
  }
});

/**
 * @route   GET /api/apis/:id
 * @desc    Gets details of a single Connected API
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const api = await ConnectedAPI.findOne({ _id: req.params.id, user: req.user._id });
    if (!api) {
      res.status(404).json({ error: 'Connected API not found.' });
      return;
    }

    res.status(200).json(api);
  } catch (error: any) {
    console.error('Get API error:', error);
    res.status(500).json({ error: 'Internal Server Error while retrieving the Connected API.' });
  }
});

/**
 * @route   PUT /api/apis/:id
 * @desc    Updates configuration, paths, token saver limits, or secret credentials of a Connected API
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const api = await ConnectedAPI.findOne({ _id: req.params.id, user: req.user._id });
    if (!api) {
      res.status(404).json({ error: 'Connected API not found.' });
      return;
    }

    const name = req.body.name;
    const specUrl = req.body.specUrl || req.body.openApiUrl;
    const token = req.body.token || req.body.credentialValue;
    const allowedPaths = req.body.allowedPaths || req.body.paths;
    const tokenSaverConfig = req.body.tokenSaverConfig;
    const credentialKeyName = req.body.credentialKeyName;
    const customHeaders = req.body.customHeaders;

    // Update basic properties
    if (name) api.name = name;
    if (customHeaders) api.customHeaders = customHeaders;

    const enableToonCompression = req.body.enableToonCompression;
    if (enableToonCompression !== undefined) {
      api.enableToonCompression = typeof enableToonCompression === 'boolean' ? enableToonCompression : false;
    }

    // If rawSpec is provided directly (manual definition), update it. Otherwise, standard URL refresh
    const rawSpec = req.body.rawSpec;
    if (rawSpec && typeof rawSpec === 'object') {
      api.rawSpec = rawSpec;
      if (specUrl) api.specUrl = specUrl;
    } else if (specUrl && specUrl !== api.specUrl) {
      try {
        const parsedSpec = await fetchAndValidateOpenAPI(specUrl);
        api.specUrl = specUrl;
        api.rawSpec = parsedSpec;
        // Reset/re-derive paths based on new spec
        api.allowedPaths = getAvailablePathsFromSpec(parsedSpec);
      } catch (err: any) {
        res.status(400).json({ error: `Failed to refresh spec from URL: ${err.message}` });
        return;
      }
    }

    // Direct path customization updates
    if (allowedPaths && Array.isArray(allowedPaths)) {
      // Validate paths exist or merge properties safely
      api.allowedPaths = allowedPaths.map((p: any) => ({
        path: p.path,
        method: p.method,
        isEnabled: typeof p.isEnabled === 'boolean' ? p.isEnabled : true,
        isWritable: typeof p.isWritable === 'boolean' ? p.isWritable : false,
      }));
    }

    // Direct Token-Saver parameter optimization tweaks
    if (tokenSaverConfig) {
      api.tokenSaverConfig = {
        maxDepth: typeof tokenSaverConfig.maxDepth === 'number' ? tokenSaverConfig.maxDepth : api.tokenSaverConfig.maxDepth,
        maxArrayLength: typeof tokenSaverConfig.maxArrayLength === 'number' ? tokenSaverConfig.maxArrayLength : api.tokenSaverConfig.maxArrayLength,
        maxCharCap: typeof tokenSaverConfig.maxCharCap === 'number' ? tokenSaverConfig.maxCharCap : api.tokenSaverConfig.maxCharCap,
        stripMetadataKeys: Array.isArray(tokenSaverConfig.stripMetadataKeys) ? tokenSaverConfig.stripMetadataKeys : api.tokenSaverConfig.stripMetadataKeys,
      };
    }

    await api.save();

    // If new secret credential token or header keyName is passed, update the EncryptedSecret
    if (token !== undefined || credentialKeyName !== undefined) {
      if (token === null || (token !== undefined && token.trim() === '')) {
        await EncryptedSecret.deleteOne({ connectedApi: api._id });
      } else {
        const updateDoc: any = {};
        if (token !== undefined) {
          const { encryptedData, iv, tag } = encrypt(token.trim());
          updateDoc.encryptedData = encryptedData;
          updateDoc.iv = iv;
          updateDoc.tag = tag;
        }
        if (credentialKeyName !== undefined) {
          updateDoc.keyName = credentialKeyName;
        }
        await EncryptedSecret.findOneAndUpdate(
          { connectedApi: api._id },
          updateDoc,
          { upsert: true, new: true }
        );
      }
    }

    res.status(200).json({
      message: 'Connected API successfully updated.',
      connectedApi: api,
    });
  } catch (error: any) {
    console.error('Update API error:', error);
    res.status(500).json({ error: 'Internal Server Error while updating Connected API.' });
  }
});

/**
 * @route   DELETE /api/apis/:id
 * @desc    Deletes a Connected API configuration and its securely encrypted tokens
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const api = await ConnectedAPI.findOne({ _id: req.params.id, user: req.user._id });
    if (!api) {
      res.status(404).json({ error: 'Connected API not found.' });
      return;
    }

    // Delete the secret first, then the API itself
    await EncryptedSecret.deleteOne({ connectedApi: api._id });
    await ConnectedAPI.deleteOne({ _id: api._id });

    res.status(200).json({ message: 'Connected API and associated credentials successfully deleted.' });
  } catch (error: any) {
    console.error('Delete API error:', error);
    res.status(500).json({ error: 'Internal Server Error while deleting Connected API.' });
  }
});

/**
 * @route   POST /api/gateways/:id/simulate
 * @desc    Simulates a gateway request trace, logging dynamic statistics and updating live metrics lists
 */
router.post('/:id/simulate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing.' });
      return;
    }

    const api = await ConnectedAPI.findOne({ _id: req.params.id, user: req.user._id });
    if (!api) {
      res.status(404).json({ error: 'Connected API/Gateway not found.' });
      return;
    }

    const enabledPaths = api.allowedPaths.filter((p: any) => p.isEnabled);
    const selectedPathConfig = enabledPaths.length > 0
      ? enabledPaths[Math.floor(Math.random() * enabledPaths.length)]
      : { path: '/api/resource', method: 'get' };

    const originalSize = Math.floor(Math.random() * 80000) + 1500;
    const compressionRatio = Number((Math.random() * 3 + 2.5).toFixed(2));
    let prunedSize = Math.floor(originalSize / compressionRatio);

    const latencyOrigin = Math.floor(Math.random() * 200) + 50; // 50-250ms
    const latencyGateway = Math.floor(Math.random() * 15) + 2; // 2-17ms
    
    const proxyStart = new Date(Date.now() - (latencyOrigin + latencyGateway));
    const originStart = new Date(proxyStart.getTime() + Math.floor(latencyGateway / 2));
    const originEnd = new Date(originStart.getTime() + latencyOrigin);
    const proxyEnd = new Date();

    const simulatedPrompts = [
      "Find top performing actions in IMDB for hitman movie query",
      "Look up clinical trials for oncology pipeline phase 3",
      "Search ChemBL database for compounds similar to aspirin",
      "Fetch biological pathway enrichment for TP53 gene in Reactome",
      "List transcription factor binding targets for JASPAR MA0139.1",
      "Check evolutionary conservation phastCons scores for genomic region chr1:10000-11000",
      "Retrieve regulatory element annotations from ENCODE SCREEN SCREEN registry"
    ];

    const simulatedModels = [
      "claude-3-5-sonnet",
      "gpt-4o",
      "deepseek-v3",
      "gemini-1.5-pro",
      "claude-3-opus"
    ];

    const simulatedClients = [
      "Cursor",
      "Claude Desktop",
      "LangChain MCP Client",
      "Bespoke Agent SDK"
    ];

    const randomPrompt = simulatedPrompts[Math.floor(Math.random() * simulatedPrompts.length)];
    const randomModel = simulatedModels[Math.floor(Math.random() * simulatedModels.length)];
    const randomClient = simulatedClients[Math.floor(Math.random() * simulatedClients.length)];

    let rawResponseBodyStr: string = JSON.stringify({
      status: "success",
      count: 2,
      results: [
        { id: 1, name: "Sample Item A", available: true },
        { id: 2, name: "Sample Item B", available: false }
      ]
    });
    let optimizedResponseBodyStr: string = rawResponseBodyStr;
    let toonResponseBodyStr: string | undefined;

    if (api.enableToonCompression) {
      try {
        const parsed = JSON.parse(optimizedResponseBodyStr);
        const toonResult = convertToToon(parsed);
        const toonSize = Buffer.byteLength(toonResult, 'utf8');
        const jsonSize = Buffer.byteLength(optimizedResponseBodyStr, 'utf8');
        if (toonSize < jsonSize) {
          toonResponseBodyStr = toonResult;
          prunedSize = toonSize;
        } else {
          toonResponseBodyStr = undefined;
          prunedSize = jsonSize;
        }
      } catch (e) {
        console.error('Failed simulation TOON conversion:', e);
      }
    }

    const simulatedTrace = await RequestTrace.create({
      traceId: crypto.randomBytes(16).toString('hex'),
      spanId: crypto.randomBytes(8).toString('hex'),
      user: req.user._id,
      connectedApi: api._id,
      toolName: getToolName(selectedPathConfig.method, selectedPathConfig.path),
      method: selectedPathConfig.method.toUpperCase(),
      path: selectedPathConfig.path,
      arguments: { q: 'simulated_query' },
      proxyStart,
      proxyEnd,
      originStart,
      originEnd,
      originalResponseSizeBytes: originalSize,
      optimizedResponseSizeBytes: prunedSize,
      originStatus: 200,
      status: 'SUCCESS',
      prompt: randomPrompt,
      modelName: randomModel,
      clientName: randomClient,
      rawResponseBody: rawResponseBodyStr,
      optimizedResponseBody: optimizedResponseBodyStr,
      toonResponseBody: toonResponseBodyStr
    });

    const log = {
      timestamp: proxyStart.toISOString(),
      gatewayName: api.name,
      method: selectedPathConfig.method.toUpperCase(),
      path: selectedPathConfig.path,
      status: 200,
      originalSize,
      prunedSize,
      compressionRatio
    };

    res.status(200).json({
      message: 'Simulated request processed.',
      log
    });
  } catch (error: any) {
    console.error('Simulation API error:', error);
    res.status(500).json({ error: 'Internal Server Error while running simulation.' });
  }
});

export default router;
