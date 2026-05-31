import supertest from 'supertest';
import app, { server } from '../index';
import { ConnectedAPI } from '../models/ConnectedAPI';
import { EncryptedSecret } from '../models/EncryptedSecret';
import axios from 'axios';

// Mock mongoose database connection calls
jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  return {
    ...original,
    connect: jest.fn().mockResolvedValue(null),
  };
});

// Mock database models
jest.mock('../models/ConnectedAPI');
jest.mock('../models/EncryptedSecret');
jest.mock('../models/RequestTrace');
jest.mock('axios');

// Mock auth middleware to bypass DB lookup and yield a mock tenant user
jest.mock('../middleware/auth', () => {
  return {
    authenticateApiKey: (req: any, res: any, next: any) => {
      req.user = {
        _id: 'tenant-123',
        email: 'tenant@test.com',
        apiKey: 'omni_gt_testkey123'
      };
      next();
    }
  };
});

describe('REST Proxy Forwarding Test-Request API', () => {
  afterAll((done) => {
    // Close the Express server to prevent open handles after tests finish
    server.close(done);
  });

  test('should return 400 if path or method is missing', async () => {
    const response = await supertest(app)
      .post('/api/gateways/gateway-123/test-request')
      .send({
        path: '/items'
        // method is missing
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Path and Method parameters are required');
  });

  test('should return 404 if gateway connection is not found', async () => {
    (ConnectedAPI.findOne as jest.Mock).mockResolvedValue(null);

    const response = await supertest(app)
      .post('/api/gateways/gateway-notfound/test-request')
      .send({
        path: '/items',
        method: 'POST'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Connected API/Gateway not found');
  });

  test('should successfully execute downstream request and decrypt credentials', async () => {
    const mockConnectedApi = {
      _id: 'gateway-123',
      name: 'Stripe Gateway',
      specUrl: 'https://api.stripe.com/v1/swagger.json',
      rawSpec: {
        servers: [
          { url: 'https://api.stripe.com/v1' }
        ]
      },
      customHeaders: {
        'x-stripe-version': '2023-10-16'
      },
      allowedPaths: [
        { path: '/customers', method: 'post', isEnabled: true, isWritable: true }
      ]
    };

    const mockSecret = {
      connectedApi: 'gateway-123',
      encryptedData: 'abcd',
      iv: '1234',
      tag: '5678'
    };

    const mockAxiosResponse = {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'application/json' },
      data: { id: 'cust_9876', object: 'customer', balance: 0 }
    };

    (ConnectedAPI.findOne as jest.Mock).mockResolvedValue(mockConnectedApi);
    (EncryptedSecret.findOne as jest.Mock).mockResolvedValue(mockSecret);
    
    // Mock decrypt function in-memory
    const cryptoModule = require('../utils/cryptography');
    jest.spyOn(cryptoModule, 'decrypt').mockReturnValue('decrypted-bearer-token');

    // Mock axios call
    (axios as unknown as jest.Mock).mockResolvedValue(mockAxiosResponse);

    const response = await supertest(app)
      .post('/api/gateways/gateway-123/test-request')
      .send({
        path: '/customers',
        method: 'POST',
        queryParams: { limit: '10' },
        headers: { 'X-Custom-Request': 'Override' },
        body: { email: 'test@user.com' }
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(201);
    expect(response.body.statusText).toBe('Created');
    expect(response.body.data).toEqual({ id: 'cust_9876', object: 'customer', balance: 0 });
    expect(response.body.latencyMs).toBeDefined();
    expect(response.body.sizeBytes).toBeGreaterThan(0);

    // Verify axios was called with the decrypted credential, custom headers, and query parameters
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.stripe.com/v1/customers',
        method: 'POST',
        params: { limit: '10' },
        headers: expect.objectContaining({
          'x-stripe-version': '2023-10-16',
          'X-Custom-Request': 'Override',
          'Authorization': 'decrypted-bearer-token'
        }),
        data: { email: 'test@user.com' }
      })
    );
  });
});
