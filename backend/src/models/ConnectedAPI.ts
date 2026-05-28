import { Schema, model, Document, Types } from 'mongoose';

export interface IPathConfig {
  path: string;
  method: string;
  isEnabled: boolean;
  isWritable: boolean;
}

export interface ITokenSaverConfig {
  maxDepth: number;
  maxArrayLength: number;
  maxCharCap: number;
  stripMetadataKeys: string[];
}

export interface IConnectedAPI extends Document {
  user: Types.ObjectId;
  name: string;
  specUrl: string;
  rawSpec: any;
  allowedPaths: IPathConfig[];
  tokenSaverConfig: ITokenSaverConfig;
  customHeaders?: Record<string, string>; // Dynamic static headers (e.g. X-Rapidapi-Host)
  createdAt: Date;
  updatedAt: Date;
}

const PathConfigSchema = new Schema<IPathConfig>({
  path: { type: String, required: true },
  method: { type: String, required: true },
  isEnabled: { type: Boolean, required: true, default: true },
  isWritable: { type: Boolean, required: true, default: false },
});

const TokenSaverConfigSchema = new Schema<ITokenSaverConfig>({
  maxDepth: { type: Number, required: true, default: 4 },
  maxArrayLength: { type: Number, required: true, default: 50 },
  maxCharCap: { type: Number, required: true, default: 50000 },
  stripMetadataKeys: {
    type: [String],
    required: true,
    default: ['traceId', 'requestId', 'spanId', 'x-request-id', 'correlationId'],
  },
});

const ConnectedAPISchema = new Schema<IConnectedAPI>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specUrl: {
      type: String,
      required: true,
      trim: true,
    },
    rawSpec: {
      type: Schema.Types.Mixed,
      required: true,
    },
    allowedPaths: {
      type: [PathConfigSchema],
      default: [],
    },
    tokenSaverConfig: {
      type: TokenSaverConfigSchema,
      required: true,
      default: () => ({}),
    },
    customHeaders: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for user and name to ensure uniqueness of connected APIs per tenant
ConnectedAPISchema.index({ user: 1, name: 1 }, { unique: true });

export const ConnectedAPI = model<IConnectedAPI>('ConnectedAPI', ConnectedAPISchema);
