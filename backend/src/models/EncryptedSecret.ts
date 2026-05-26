import { Schema, model, Document, Types } from 'mongoose';

export interface IEncryptedSecret extends Document {
  connectedApi: Types.ObjectId;
  encryptedData: string; // Hex-encoded encrypted secret value
  iv: string;            // Hex-encoded 12-byte initialization vector
  tag: string;           // Hex-encoded 16-byte GCM authentication tag
  createdAt: Date;
  updatedAt: Date;
}

const EncryptedSecretSchema = new Schema<IEncryptedSecret>(
  {
    connectedApi: {
      type: Schema.Types.ObjectId,
      ref: 'ConnectedAPI',
      required: true,
      unique: true, // One secret configuration per Connected API
    },
    encryptedData: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EncryptedSecret = model<IEncryptedSecret>('EncryptedSecret', EncryptedSecretSchema);
