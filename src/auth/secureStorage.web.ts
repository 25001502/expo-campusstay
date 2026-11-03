import type { KeyValueStorage } from './sessionStorage';
// Native mobile is the H1.1 target. Web previews never put tokens in localStorage.
const values = new Map<string, string>();
export const authStorage: KeyValueStorage = {
  getItem: async (key) => values.get(key) ?? null,
  setItem: async (key, value) => { values.set(key, value); },
  removeItem: async (key) => { values.delete(key); },
};
