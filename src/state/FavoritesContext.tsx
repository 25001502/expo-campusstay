import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { favoritesReducer } from '../discovery';

const INITIAL_FAVORITES = ['p1', 'p3'];

type FavoritesValue = {
  favoriteIds: string[];
  isFavorite: (propertyId: string) => boolean;
  toggleFavorite: (propertyId: string) => void;
  addFavorite: (propertyId: string) => void;
  removeFavorite: (propertyId: string) => void;
  resetFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, dispatch] = useReducer(favoritesReducer, INITIAL_FAVORITES);
  const isFavorite = useCallback((propertyId: string) => favoriteIds.includes(propertyId), [favoriteIds]);
  const toggleFavorite = useCallback((propertyId: string) => dispatch({ type: 'toggle', id: propertyId }), []);
  const addFavorite = useCallback((propertyId: string) => dispatch({ type: 'add', id: propertyId }), []);
  const removeFavorite = useCallback((propertyId: string) => dispatch({ type: 'remove', id: propertyId }), []);
  const resetFavorites = useCallback(() => dispatch({ type: 'reset', ids: INITIAL_FAVORITES }), []);
  const value = useMemo(() => ({
    favoriteIds,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    resetFavorites,
  }), [addFavorite, favoriteIds, isFavorite, removeFavorite, resetFavorites, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used inside FavoritesProvider');
  return value;
}
