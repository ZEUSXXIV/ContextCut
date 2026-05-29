import { Schema, model, Document, Types } from 'mongoose';

export interface IRequestTrace extends Document {
  traceId: string;
  spanId: string;
  user: Types.ObjectId;
  connectedApi: Types.ObjectId;
  toolName: string;
  method?: string;
  path?: string;
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
  
  // Advanced Telemetry Payloads
  requestHeaders?: Record<string, string>;
  requestBody?: Record<string, any>;
  requestQuery?: Record<string, any>;
  rawResponseBody?: string;
  optimizedResponseBody?: string;
  
  // Advanced Telemetry (Model, Client, Prompt)
  prompt?: string;
  modelName?: string;
  clientName?: string;
  toonResponseBody?: string;
  
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
    method: {
      type: String,
    },
    path: {
      type: String,
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
    requestHeaders: {
      type: Schema.Types.Mixed,
    },
    requestBody: {
      type: Schema.Types.Mixed,
    },
    requestQuery: {
      type: Schema.Types.Mixed,
    },
    rawResponseBody: {
      type: String,
    },
    optimizedResponseBody: {
      type: String,
    },
    prompt: {
      type: String,
    },
    modelName: {
      type: String,
    },
    clientName: {
      type: String,
    },
    toonResponseBody: {
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
