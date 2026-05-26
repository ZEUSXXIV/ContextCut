import { Router, Response } from 'express';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ConnectedAPI } from '../models/ConnectedAPI';
import { EncryptedSecret } from '../models/EncryptedSecret';
import { fetchAndValidateOpenAPI, getAvailablePathsFromSpec } from '../utils/openapiParser';
import { encrypt } from '../utils/cryptography';

const router = Router();

// Apply authorization middleware to all CRUD endpoints in this router
router.use(authenticateApiKey as any);

/**
 * @route   POST /api/apis
 * @desc    Creates a new Connected API, parses its OpenAPI spec, sets default paths, and encrypts its secret key if provided
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, specUrl, token } = req.body;

    if (!name || !specUrl) {
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
    try {
      rawSpec = await fetchAndValidateOpenAPI(specUrl);
    } catch (err: any) {
      res.status(400).json({ error: `OpenAPI spec loading error: ${err.message}` });
      return;
    }

    // Get default path capabilities (GET read-only, others mutating)
    const allowedPaths = getAvailablePathsFromSpec(rawSpec);

    // Create the Connected API configuration document
    const connectedApi = new ConnectedAPI({
      user: req.user._id,
      name,
      specUrl,
      rawSpec,
      allowedPaths,
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

    const { name, specUrl, allowedPaths, tokenSaverConfig, token } = req.body;

    // Update basic properties
    if (name) api.name = name;

    // If specification URL changed, re-parse and refresh paths
    if (specUrl && specUrl !== api.specUrl) {
      try {
        const rawSpec = await fetchAndValidateOpenAPI(specUrl);
        api.specUrl = specUrl;
        api.rawSpec = rawSpec;
        // Reset/re-derive paths based on new spec
        api.allowedPaths = getAvailablePathsFromSpec(rawSpec);
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

    // If new secret credential token is passed, update the EncryptedSecret
    if (token !== undefined) {
      // Delete existing if blank is set, otherwise upsert
      if (token === null || token.trim() === '') {
        await EncryptedSecret.deleteOne({ connectedApi: api._id });
      } else {
        const { encryptedData, iv, tag } = encrypt(token.trim());
        await EncryptedSecret.findOneAndUpdate(
          { connectedApi: api._id },
          { encryptedData, iv, tag },
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

export default router;
