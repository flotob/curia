/**
 * Category Registry Implementation
 * 
 * Centralized registry for managing gating category renderers
 * Supports dynamic registration and plugin-like architecture
 */

import { 
  CategoryRegistry, 
  CategoryRenderer, 
  GatingCategoryType, 
  GatingCategoryMetadata 
} from '@/types/gating';

/**
 * Singleton registry for gating category renderers
 */
class GatingCategoryRegistry implements CategoryRegistry {
  private renderers = new Map<GatingCategoryType, CategoryRenderer>();
  private static instance: GatingCategoryRegistry;

  /**
   * Get the singleton instance
   */
  static getInstance(): GatingCategoryRegistry {
    if (!GatingCategoryRegistry.instance) {
      GatingCategoryRegistry.instance = new GatingCategoryRegistry();
    }
    return GatingCategoryRegistry.instance;
  }

  /**
   * Register a category renderer
   */
  register(type: GatingCategoryType, renderer: CategoryRenderer): void {
    console.log(`[GatingRegistry] Registering category renderer: ${type}`);
    this.renderers.set(type, renderer);
  }

  /**
   * Get a category renderer by type
   */
  get(type: GatingCategoryType): CategoryRenderer | undefined {
    return this.renderers.get(type);
  }

  /**
   * List all registered categories with their metadata
   */
  list(): { type: GatingCategoryType; metadata: GatingCategoryMetadata }[] {
    const categories: { type: GatingCategoryType; metadata: GatingCategoryMetadata }[] = [];
    
    for (const [type, renderer] of this.renderers.entries()) {
      categories.push({
        type,
        metadata: renderer.getMetadata()
      });
    }
    
    // Sort by category name for consistent ordering
    categories.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    
    return categories;
  }

  /**
   * Check if a category type is supported
   */
  isSupported(type: GatingCategoryType): boolean {
    return this.renderers.has(type);
  }

  /**
   * Unregister a category (for testing or hot reloading)
   */
  unregister(type: GatingCategoryType): boolean {
    return this.renderers.delete(type);
  }

  /**
   * Get all registered category types
   */
  getRegisteredTypes(): GatingCategoryType[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.renderers.clear();
  }
}

// Export the singleton instance
export const categoryRegistry = GatingCategoryRegistry.getInstance();

// Export the class for testing
export { GatingCategoryRegistry };

/**
 * Utility function to ensure a category renderer is registered
 */
export function ensureRegistered(type: GatingCategoryType): CategoryRenderer {
  const renderer = categoryRegistry.get(type);
  if (!renderer) {
    throw new Error(`Category renderer not found: ${type}. Make sure it's registered before use.`);
  }
  return renderer;
}

/**
 * Utility function to register multiple renderers at once
 */
export function registerCategories(
  renderers: { type: GatingCategoryType; renderer: CategoryRenderer }[]
): void {
  for (const { type, renderer } of renderers) {
    categoryRegistry.register(type, renderer);
  }
  console.log(`[GatingRegistry] Registered ${renderers.length} category renderers`);
} 