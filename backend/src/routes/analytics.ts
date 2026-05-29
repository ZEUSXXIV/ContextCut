import { Router, Response } from 'express';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ConnectedAPI } from '../models/ConnectedAPI';
import { RequestTrace } from '../models/RequestTrace';

const router = Router();

/**
 * @route   GET /api/analytics
 * @desc    Yields aggregated metrics and recent gateway request trace logs from MongoDB
 */
router.get('/', authenticateApiKey as any, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing.' });
      return;
    }

    const apisCount = await ConnectedAPI.countDocuments({ user: req.user._id });
    const totalRequests = await RequestTrace.countDocuments({ user: req.user._id });

    // Calculate average compression ratio from RequestTraces where sizes are present and > 0
    const compressionStats = await RequestTrace.aggregate([
      {
        $match: {
          user: req.user._id,
          originalResponseSizeBytes: { $gt: 0 },
          optimizedResponseSizeBytes: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgOriginal: { $avg: '$originalResponseSizeBytes' },
          avgOptimized: { $avg: '$optimizedResponseSizeBytes' }
        }
      }
    ]);

    let averageCompressionRatio = 4.15; // default fallback ratio if no requests have been logged yet
    if (compressionStats.length > 0) {
      const stats = compressionStats[0];
      if (stats.avgOptimized > 0) {
        averageCompressionRatio = Number((stats.avgOriginal / stats.avgOptimized).toFixed(2));
      }
    }

    // Retrieve latest 25 RequestTraces
    const traces = await RequestTrace.find({ user: req.user._id })
      .sort({ proxyStart: -1 })
      .limit(25)
      .populate('connectedApi', 'name');

    const liveRequestTracker = traces.map(trace => {
      const api = trace.connectedApi as any;
      const originalSize = trace.originalResponseSizeBytes || 0;
      const prunedSize = trace.optimizedResponseSizeBytes || 0;
      const compressionRatio = prunedSize > 0 ? Number((originalSize / prunedSize).toFixed(2)) : 1.0;

      return {
        id: trace._id,
        traceId: trace.traceId,
        spanId: trace.spanId,
        timestamp: trace.proxyStart.toISOString(),
        gatewayName: api ? api.name : (trace.toolName.startsWith('dummy_') || trace.toolName.startsWith('get_items') ? 'Dummy Testing API' : 'Manual API'),
        method: trace.method || (trace.toolName.startsWith('post_') ? 'POST' : 'GET'),
        path: trace.path || `/${trace.toolName.replace(/_/g, '/')}`,
        toolName: trace.toolName,
        status: trace.originStatus || (trace.status === 'GATEWAY_ERROR' ? 403 : 500),
        traceStatus: trace.status,
        errorMessage: trace.errorMessage,
        arguments: trace.arguments,
        originalSize,
        prunedSize,
        compressionRatio,
        latencies: {
          total: trace.proxyEnd.getTime() - trace.proxyStart.getTime(),
          gateway: (trace.proxyEnd.getTime() - trace.proxyStart.getTime()) - 
                   ((trace.originEnd && trace.originStart) ? (trace.originEnd.getTime() - trace.originStart.getTime()) : 0),
          origin: (trace.originEnd && trace.originStart) ? (trace.originEnd.getTime() - trace.originStart.getTime()) : 0
        },
        requestHeaders: trace.requestHeaders,
        requestBody: trace.requestBody,
        requestQuery: trace.requestQuery,
        rawResponseBody: trace.rawResponseBody,
        optimizedResponseBody: trace.optimizedResponseBody,
        prompt: trace.prompt,
        model: trace.modelName,
        clientName: trace.clientName,
        toonResponseBody: trace.toonResponseBody
      };
    });

    res.json({
      totalRequests,
      averageCompressionRatio,
      activeConnectionsCount: apisCount,
      liveRequestTracker
    });
  } catch (error: any) {
    console.error('Analytics route error:', error);
    res.status(500).json({ error: 'Internal Server Error while aggregating analytics.' });
  }
});

export default router;
