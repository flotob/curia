/**
 * Category Registration System
 * 
 * Initializes and registers all available gating category renderers
 * This ensures the category registry is populated before components use it
 */

import { universalProfileRenderer } from './renderers/UniversalProfileRenderer';
import { ethereumProfileRenderer } from './renderers/EthereumProfileRenderer';
import { categoryRegistry } from './categoryRegistry';

/**
 * Register all available gating category renderers
 * This should be called during app initialization
 */
export function registerAllCategories(): void {
  console.log('[GatingCategories] Registering all category renderers...');
  
  // Register Universal Profile renderer
  categoryRegistry.register('universal_profile', universalProfileRenderer);
  
  // Register Ethereum Profile renderer
  categoryRegistry.register('ethereum_profile', ethereumProfileRenderer);
  
  // Future category registrations will go here:
  // categoryRegistry.register('ens_domain', ensDomainRenderer);
  // categoryRegistry.register('nft_collection', nftCollectionRenderer);
  
  const registeredCount = categoryRegistry.getRegisteredTypes().length;
  console.log(`[GatingCategories] Successfully registered ${registeredCount} category renderers`);
}

/**
 * Ensure categories are registered (call this before using registry)
 * Idempotent - safe to call multiple times
 */
export function ensureCategoriesRegistered(): void {
  if (categoryRegistry.getRegisteredTypes().length === 0) {
    registerAllCategories();
  }
}

/**
 * Get available category types for UI selection
 */
export function getAvailableCategories() {
  ensureCategoriesRegistered();
  return categoryRegistry.list();
}

/**
 * Check if a category type is available
 */
export function isCategoryAvailable(type: string): boolean {
  ensureCategoriesRegistered();
  return categoryRegistry.isSupported(type);
} 