import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove expired sessions from MongoDB
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ sessionToken: 1 });

export const Session = model<ISession>('Session', SessionSchema);
