import { Schema, model, Document, Types } from 'mongoose';

export interface IRequestTrace extends Document {
  traceId: string;
  spanId: string;
  user: Types.ObjectId;
  connectedApi: Types.ObjectId;
  toolName: string;
  arguments?: Record<string, any>;
  
  // Latency Metrics
  proxyStart: Date;
  proxyEnd: Date;
  originStart?: Date;
  originEnd?: Date;
  
  // Payload Metrics
  originalResponseSizeBytes?: number;
  optimizedResponseSizeBytes?: number;
  
  // Statuses & Diagnostics
  originStatus?: number;
  status: 'SUCCESS' | 'API_ERROR' | 'GATEWAY_ERROR';
  errorMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const RequestTraceSchema = new Schema<IRequestTrace>(
  {
    traceId: {
      type: String,
      required: true,
      index: true,
    },
    spanId: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    connectedApi: {
      type: Schema.Types.ObjectId,
      ref: 'ConnectedAPI',
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      required: true,
    },
    arguments: {
      type: Schema.Types.Mixed,
    },
    proxyStart: {
      type: Date,
      required: true,
      index: true,
    },
    proxyEnd: {
      type: Date,
      required: true,
    },
    originStart: {
      type: Date,
    },
    originEnd: {
      type: Date,
    },
    originalResponseSizeBytes: {
      type: Number,
    },
    optimizedResponseSizeBytes: {
      type: Number,
    },
    originStatus: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'API_ERROR', 'GATEWAY_ERROR'],
      required: true,
      default: 'SUCCESS',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove traces from MongoDB after 7 days (604800 seconds)
RequestTraceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export const RequestTrace = model<IRequestTrace>('RequestTrace', RequestTraceSchema);
