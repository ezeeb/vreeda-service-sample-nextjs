// models/PKCEState.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * PKCE State Document
 * Temporary storage for PKCE code verifiers during OAuth2 flow
 * Automatically cleaned up after 5 minutes via TTL index
 */
interface PKCEStateDocument extends Document {
  state: string;           // Random state value (CSRF protection)
  codeVerifier: string;    // PKCE code verifier
  createdAt: Date;         // Creation timestamp (used for TTL)
}

// Define the schema
const PKCEStateSchema = new Schema<PKCEStateDocument>({
  state: {
    type: String,
    required: true,
    unique: true,  // Each state value must be unique
    index: true    // Index for fast lookups
  },
  codeVerifier: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300  // TTL index: Auto-delete after 5 minutes (300 seconds)
  }
});

// Create or reuse the model
const PKCEState: Model<PKCEStateDocument> =
  mongoose.models.PKCEState || mongoose.model('PKCEState', PKCEStateSchema);

export default PKCEState;
