#!/usr/bin/env tsx
/**
 * Build Embed Script
 * 
 * This script compiles all embed TypeScript modules into a single
 * JavaScript file and outputs it to public/embed.js for static serving.
 * 
 * Usage:
 *   yarn build:embed
 *   tsx scripts/build-embed.ts
 *   tsx scripts/build-embed.ts --watch  (for development)
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { buildEmbedScript } from '../src/lib/embed/main';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { watch } from 'fs';

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

async function buildEmbedForProduction() {
  try {
    console.log('[Build] Building embed.js...');
    
    const embedScript = await buildEmbedScript({
      environment: isProduction ? 'production' : 'development',
      minify: false, // Disable minification - the naive approach breaks syntax
      sourceMap: !isProduction
    });
    
    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }
    
    // Write to public directory
    const outputPath = join(publicDir, 'embed.js');
    writeFileSync(outputPath, embedScript);
    
    const sizeKB = Math.round(embedScript.length / 1024);
    console.log(`✅ Built embed.js to public/embed.js (${sizeKB}KB)`);
    
    if (!isProduction) {
      console.log('💡 Test at: http://localhost:3001/embed.js');
    }
    
  } catch (error) {
    console.error('❌ Failed to build embed.js:', error);
    process.exit(1);
  }
}

// Watch mode for development
function startWatchMode() {
  console.log('👀 Watching for changes in src/lib/embed/...');
  
  const watchPath = join(process.cwd(), 'src/lib/embed');
  
  // Initial build
  buildEmbedForProduction();
  
  // Watch for changes
  watch(watchPath, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.ts')) {
      console.log(`📝 File changed: ${filename}`);
      buildEmbedForProduction();
    }
  });
}

// Main execution
if (isWatch) {
  startWatchMode();
} else {
  buildEmbedForProduction();
} 