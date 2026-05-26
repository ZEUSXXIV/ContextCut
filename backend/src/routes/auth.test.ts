import supertest from 'supertest';
import app, { server } from '../index';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { hashPassword } from '../utils/cryptography';

// Mock mongoose connection to database
jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  return {
    ...original,
    connect: jest.fn().mockResolvedValue(null),
  };
});

// Mock database models
jest.mock('../models/User');
jest.mock('../models/Session');

describe('Authentication Flow Phase 5 Tests', () => {
  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    test('should register unverified user and print OTP to console', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      const mockSave = jest.fn().mockImplementation(function(this: any) {
        this.isVerified = false;
        return Promise.resolve(this);
      });
      (User as any).prototype.save = mockSave;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await supertest(app)
        .post('/api/auth/signup')
        .send({ email: 'newuser@test.com', password: 'securepassword123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Registration successful');
      expect(res.body.user.isVerified).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Signup OTP for newuser@test.com]')
      );
      consoleSpy.mockRestore();
    });

    test('should reject duplicate emails', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: 'exists@test.com' });

      const res = await supertest(app)
        .post('/api/auth/signup')
        .send({ email: 'exists@test.com', password: 'securepassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    test('should fail if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await supertest(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'nonexistent@test.com', otp: '123456' });

      expect(res.status).toBe(404);
    });

    test('should verify OTP and issue cookie session', async () => {
      const mockOtp = '123456';
      const mockOtpHash = hashPassword(mockOtp);
      const mockUser = {
        _id: 'user-id-abc',
        email: 'unverified@test.com',
        isVerified: false,
        otpHash: mockOtpHash,
        otpExpiresAt: new Date(Date.now() + 60000),
        save: jest.fn().mockResolvedValue(true),
        apiKey: 'omni_gt_somekey',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Session as any).prototype.save = jest.fn().mockResolvedValue(true);

      const res = await supertest(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'unverified@test.com', otp: mockOtp });

      expect(res.status).toBe(200);
      expect(res.body.user.isVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      
      // Verify cookie session header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('session_token');
    });
  });

  describe('POST /api/auth/resend-otp', () => {
    test('should generate new OTP for unverified account', async () => {
      const mockUser = {
        email: 'unverified@test.com',
        isVerified: false,
        otpHash: '',
        otpExpiresAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const res = await supertest(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'unverified@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('new OTP has been generated');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    test('should block login if user is not verified', async () => {
      const plainPassword = 'password123';
      const passHash = hashPassword(plainPassword);
      const mockUser = {
        email: 'unverified@test.com',
        passwordHash: passHash,
        isVerified: false,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'unverified@test.com', password: plainPassword });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Verification needed');
    });

    test('should sign cookie session if user is verified', async () => {
      const plainPassword = 'password123';
      const passHash = hashPassword(plainPassword);
      const mockUser = {
        _id: 'user-id-abc',
        email: 'verified@test.com',
        passwordHash: passHash,
        isVerified: true,
        apiKey: 'omni_gt_verifiedkey',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Session as any).prototype.save = jest.fn().mockResolvedValue(true);

      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'verified@test.com', password: plainPassword });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });
});
