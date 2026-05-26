import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { hashPassword, verifyPassword } from '../utils/cryptography';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Registers a new tenant/user and issues a secure API key
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

    // Securely hash the password
    const passwordHash = hashPassword(password);

    // Generate a secure API key starting with 'omni_gt_'
    const randomHex = crypto.randomBytes(24).toString('hex');
    const apiKey = `omni_gt_${randomHex}`;

    // Create and save new user
    const newUser = new User({
      email,
      passwordHash,
      apiKey,
    });

    await newUser.save();

    res.status(201).json({
      message: 'Registration successful. Please save your API key securely.',
      user: {
        id: newUser._id,
        email: newUser.email,
      },
      apiKey: newUser.apiKey,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal Server Error during registration.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a tenant and returns their user profile and API key
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

    // Verify the password
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user._id,
        email: user.email,
      },
      apiKey: user.apiKey,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error during login.' });
  }
});

export default router;
