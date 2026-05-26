import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from './models/User';
import { hashPassword } from './utils/cryptography';

// Load environment variables
dotenv.config();

// Import modular routing packages
import authRoutes from './routes/auth';
import apisRoutes from './routes/apis';
import mcpRoutes from './routes/mcp';

const app = express();
const port = process.env.PORT || 3001;

// Global middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Omni MCP Gateway Backend' });
});

// Mount modular REST and SSE proxy routing
app.use('/api/auth', authRoutes);
app.use('/api/apis', apisRoutes);
app.use('/api/gateways', apisRoutes);
app.use('/api/mcp', mcpRoutes);

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/omni-mcp-gateway';
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    try {
      const devUser = await User.findOne({ email: 'developer@omnimcp.local' });
      if (!devUser) {
        const devApiKey = 'omni_gt_developer_key_123456';
        const newUser = new User({
          email: 'developer@omnimcp.local',
          passwordHash: hashPassword('developer123'),
          apiKey: devApiKey
        });
        await newUser.save();
        console.log('Seeded default developer tenant. API Key: omni_gt_developer_key_123456');
      }
    } catch (err) {
      console.error('Error seeding default developer user:', err);
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Start listening
const server = app.listen(port, () => {
  console.log(`Omni MCP Gateway running on http://localhost:${port}`);
});

export default app;
export { server };
