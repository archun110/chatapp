// cryptoUtils.js

// Import Web Crypto API
const crypto = window.crypto;

// Utility function to parse JSON only if it's a string
const parseJSONIfNeeded = (key) => {
  if (typeof key === "string") {
    try {
      return JSON.parse(key); // Parse only if it's a string
    } catch (error) {
      console.error("Invalid JSON string:", key);
      throw error;
    }
  }
  return key; // If already an object, return as-is
};

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

  // Export the public and private keys for persistence and sharing
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    privateKey: JSON.stringify(privateKey), // Export as a JSON string for storage
    publicKey: JSON.stringify(publicKey), // Export as a JSON string for sharing
  };
};

// Import a private key for use
export const importPrivateKey = async (privateKeyJwk) => {
  const parsedKey = parseJSONIfNeeded(privateKeyJwk);
  return await crypto.subtle.importKey(
    "jwk",
    parsedKey,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
};

// Import a public key for use
export const importPublicKey = async (publicKeyJwk) => {
  const parsedKey = parseJSONIfNeeded(publicKeyJwk);
  return await crypto.subtle.importKey(
    "jwk",
    parsedKey,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );
};

// Derive a shared secret using the private key and the other user's public key
export const deriveSharedSecret = async (privateKeyJwk, otherPublicKeyJwk) => {
  // Import the private and public keys
  const privateKey = await importPrivateKey(privateKeyJwk);
  const importedPublicKey = await importPublicKey(otherPublicKeyJwk);

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
