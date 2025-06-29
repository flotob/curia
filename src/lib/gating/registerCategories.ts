/**
 * Category Registration System
 * 
 * Initializes and registers all available gating category renderers
 * This ensures the category registry is populated before components use it
 */

import { categoryRegistry } from './categoryRegistry';
import { EthereumProfileRenderer } from './renderers/EthereumProfileRenderer';

/**
 * Register all available gating category renderers
 * This should be called once during app initialization
 */
export function registerAllCategories(): void {
  // The 'universal_profile' renderer is now integrated directly via UPVerificationWrapper
  // and does not need to be registered here.
  categoryRegistry.register('ethereum_profile', new EthereumProfileRenderer());
}

/**
 * Ensure categories are registered (call this before using registry)
 * Idempotent - safe to call multiple times
 */
export function ensureCategoriesRegistered(): void {
  // We check a specific, known renderer to see if registration has run.
  if (!categoryRegistry.get('ethereum_profile')) {
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