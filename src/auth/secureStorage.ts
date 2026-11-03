import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { createSessionStorage } from './sessionStorage';

const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
export const authStorage = createSessionStorage({
  getItem: (key) => SecureStore.getItemAsync(key, options),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
  removeItem: (key) => SecureStore.deleteItemAsync(key, options),
}, randomUUID);
