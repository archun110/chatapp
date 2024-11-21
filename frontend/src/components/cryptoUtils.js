// cryptoUtils.js

// Import Web Crypto API
const crypto = window.crypto;

// Generate an ECDH key pair
export const generateKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256", // Use a standardized elliptic curve
    },
    true, // Keys are extractable
    ["deriveKey", "deriveBits"]
  );

  // Export the public key for sharing
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey: keyPair.privateKey,
    publicKey: JSON.stringify(publicKey), // Convert public key to a string for display
  };
};

// Derive a shared secret using the private key and the other user's public key
export const deriveSharedSecret = async (privateKey, otherPublicKey) => {
  // Import the other user's public key
  const importedPublicKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(otherPublicKey), // Parse the JSON public key
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );

  // Derive the shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: importedPublicKey,
    },
    privateKey,
    256 // Length of the shared secret in bits
  );

  return sharedSecret; // Return the raw shared secret
};

// Encrypt a message using AES-GCM
export const encryptMessage = async (sharedSecret, message) => {
  // Derive a cryptographic key from the shared secret
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt"]
  );

  // Generate a random initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the message
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedMessage = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedMessage
  );

  return {
    encryptedMessage: Array.from(new Uint8Array(encryptedMessage)), // Convert ArrayBuffer to array
    iv: Array.from(iv), // Convert IV to array
  };
};

// Decrypt a message using AES-GCM
export const decryptMessage = async (sharedSecret, encryptedMessage, iv) => {
  // Derive a cryptographic key from the shared secret
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"]
  );

  // Convert arrays back to ArrayBuffer
  const encryptedBuffer = new Uint8Array(encryptedMessage).buffer;
  const ivBuffer = new Uint8Array(iv).buffer;

  // Decrypt the message
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    aesKey,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedBuffer); // Decode the decrypted message
};
