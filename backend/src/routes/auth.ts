import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { hashPassword, verifyPassword } from '../utils/cryptography';
import { sessionAuth } from '../middleware/sessionAuth';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Registers a new tenant/user as unverified, generates a random 6-digit OTP,
 *          saves its scrypt hash and 5-minute expiry in User document, and prints the OTP to the console.
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'A user with this email already exists.' });
      return;
    }

    // Securely hash the password using scrypt
    const passwordHash = hashPassword(password);

    // Generate a secure API key starting with 'omni_gt_'
    const randomHex = crypto.randomBytes(24).toString('hex');
    const apiKey = `omni_gt_${randomHex}`;

    // Generate numeric 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashPassword(otp);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create and save new unverified user
    const newUser = new User({
      email,
      passwordHash,
      apiKey,
      isVerified: false,
      otpHash,
      otpExpiresAt,
    });

    await newUser.save();

    // Print the OTP to console
    console.log(`[Signup OTP for ${email}]: ${otp}`);

    res.status(201).json({
      message: 'Registration successful. An OTP has been generated.',
      otpRequired: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        isVerified: newUser.isVerified,
      },
      otp, // Returned for testing purposes in standard sandbox flow
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal Server Error during registration.' });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Receives email and 6-digit OTP code, verifies hash and expiry.
 *          If valid, marks isVerified = true, creates a Session document,
 *          and sets a secure httpOnly cookie with a signed session token.
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP code are required.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account is already verified.' });
      return;
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      res.status(400).json({ error: 'No active OTP found for this account.' });
      return;
    }

    // Check expiry
    if (user.otpExpiresAt < new Date()) {
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Verify scrypt hash with timing-safe check
    const isOtpValid = verifyPassword(otp, user.otpHash);
    if (!isOtpValid) {
      res.status(400).json({ error: 'Invalid OTP code.' });
      return;
    }

    // Update user to verified
    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Create a new session in DB
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = new Session({
      userId: user._id,
      sessionToken,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    await session.save();

    // Set signed cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.status(200).json({
      message: 'Email verified successfully.',
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        apiKey: user.apiKey,
      },
    });
  } catch (error: any) {
    console.error('Verify-OTP error:', error);
    res.status(500).json({ error: 'Internal Server Error during OTP verification.' });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Regenerates a new 6-digit OTP and expiration for unverified accounts.
 */
router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account is already verified.' });
      return;
    }

    // Generate new 6-digit OTP and its scrypt hash
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpHash = hashPassword(otp);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await user.save();

    // Print the OTP to console
    console.log(`[Resent OTP for ${email}]: ${otp}`);

    res.status(200).json({
      message: 'A new OTP has been generated and printed to console.',
      otp, // Returned for testing purposes in standard sandbox flow
    });
  } catch (error: any) {
    console.error('Resend-OTP error:', error);
    res.status(500).json({ error: 'Internal Server Error during resending OTP.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a tenant with standard timing-safe comparison of password hash.
 *          If verified, sets cookie. If not, blocks login and signals verification needed.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Verify password with timing-safe comparison
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // If not verified, block login and signal verification needed
    if (!user.isVerified) {
      // Automatically generate a new OTP to facilitate login verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpHash = hashPassword(otp);
      user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await user.save();

      console.log(`[Login OTP for ${email}]: ${otp}`);

      res.status(403).json({
        error: 'Verification needed. Please verify your account using OTP before logging in.',
        verified: false,
        otpRequired: true,
        otp, // Returned for testing purposes in standard sandbox flow
      });
      return;
    }

    // Create session in DB
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = new Session({
      userId: user._id,
      sessionToken,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    await session.save();

    // Set signed cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        apiKey: user.apiKey,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error during login.' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Decrypts cookie session, queries profile details, and returns user metadata.
 */
router.get('/me', sessionAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    res.status(200).json({
      user: {
        id: req.user._id,
        email: req.user.email,
        isVerified: req.user.isVerified,
        apiKey: req.user.apiKey,
      },
    });
  } catch (error: any) {
    console.error('Me query error:', error);
    res.status(500).json({ error: 'Internal Server Error during session lookup.' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Revokes active session token in DB and clears the cookie.
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = req.signedCookies?.session_token;
    if (sessionToken) {
      await Session.deleteOne({ sessionToken });
    }

    res.clearCookie('session_token');
    res.status(200).json({ message: 'Logout successful.' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal Server Error during logout.' });
  }
});

export default router;
