import { Platform } from 'react-native';
import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

// Supply only the WebCrypto operations Supabase's PKCE helper needs on native.
// This prevents its Math.random/plain-challenge fallback on older RN runtimes.
if (Platform.OS !== 'web') {
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
  if (!globalThis.crypto.getRandomValues) Object.defineProperty(globalThis.crypto, 'getRandomValues', { value: getRandomValues });
  if (!globalThis.crypto.subtle) Object.defineProperty(globalThis.crypto, 'subtle', { value: {
    digest: (algorithm: string, data: BufferSource) => {
      if (algorithm !== 'SHA-256') return Promise.reject(new Error('Unsupported authentication digest.'));
      return digest(CryptoDigestAlgorithm.SHA256, data);
    },
  } });
}
