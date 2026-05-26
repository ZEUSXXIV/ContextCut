import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Global middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Omni MCP Gateway Backend' });
});

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/omni-mcp-gateway';
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
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
