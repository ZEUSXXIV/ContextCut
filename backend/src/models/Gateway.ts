import mongoose, { Schema, Document } from 'mongoose';

export interface IPathConfig {
  path: string;
  method: string;
  isEnabled: boolean;
  isWritable: boolean;
}

export interface IGateway extends Document {
  name: string;
  openApiUrl: string;
  paths: IPathConfig[];
  credentialKeyName?: string;
  credentialValueEncrypted?: string;
  credentialValueIv?: string;
  totalRequests: number;
  compressionRatioSum: number;
  createdAt: Date;
}

const PathConfigSchema = new Schema<IPathConfig>({
  path: { type: String, required: true },
  method: { type: String, required: true },
  isEnabled: { type: Boolean, default: true },
  isWritable: { type: Boolean, default: false }
});

const GatewaySchema = new Schema<IGateway>({
  name: { type: String, required: true },
  openApiUrl: { type: String, required: true },
  paths: [PathConfigSchema],
  credentialKeyName: { type: String },
  credentialValueEncrypted: { type: String },
  credentialValueIv: { type: String },
  totalRequests: { type: Number, default: 0 },
  compressionRatioSum: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Gateway = mongoose.model<IGateway>('Gateway', GatewaySchema);
