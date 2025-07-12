# Embed Configurator Specification

## Overview
Create a "Get Started" page that allows users to configure and customize their Web3 forum embed with live preview and copy-paste embed code generation.

## Objectives
1. **Live Configuration**: Users can adjust embed parameters in real-time
2. **Instant Preview**: See changes immediately in a live embed preview
3. **Copy-Paste Ready**: Generate ready-to-use embed code
4. **Progressive Enhancement**: Start with basic size configuration, expand later

## Phase 1: Basic Size Configuration

### Core Features
- **Size Presets**: Small (400px), Medium (600px), Large (800px), Custom
- **Custom Dimensions**: Width/Height input fields
- **Live Preview**: Real embed updates as user configures
- **Code Generation**: Auto-updating script tag with data attributes
- **Copy Button**: One-click copy of generated embed code

### Current Embed System Analysis
*[To be filled as I study the codebase]*

### Data Attributes to Implement
- `data-width` - Set embed width
- `data-height` - Set embed height  
- `data-theme` - Light/Dark/Auto (already exists?)
- *[More to be discovered during code analysis]*

## Phase 2: Advanced Configuration (Future)
- Community selection (`data-community-id`)
- Theme customization
- Feature toggles
- Responsive settings

## Technical Implementation Plan

### Phase 1: Add Width Configuration Support

#### 1. Extend EmbedConfig Interface
```typescript
export interface EmbedConfig {
  community: string | null;
  theme: 'light' | 'dark';
  container: string | null;
  height: string;
  width: string; // NEW: Add width support
}
```

#### 2. Update EmbedConfig.ts
- Add `data-width` attribute parsing in `parseEmbedConfig()`
- Add width validation in `validateEmbedConfig()`
- Default to '100%' for backwards compatibility

#### 3. Update InternalPluginHost.ts
Current iframe styling (lines 82, 172):
```javascript
iframe.style.width = '100%'; // HARDCODED
iframe.style.height = this.config.height || '700px';
```

Change to:
```javascript
iframe.style.width = this.config.width || '100%';
iframe.style.height = this.config.height || '700px';
```

#### 4. Create Get Started Page
New route: `/get-started`
- Left: Size configurator (presets + custom inputs)
- Center: Live preview with real embed
- Right: Generated embed code with copy button

### Phase 2: Build Configurator UI

#### Component Structure
```
/get-started
├── EmbedConfigurator (left panel)
│   ├── SizePresets (Small/Medium/Large buttons)
│   ├── CustomSizeInputs (width/height fields)
│   └── ThemeSelector (light/dark/auto)
├── LivePreview (center)
│   └── Real embed with current config
└── CodeGenerator (right panel)
    ├── Generated <script> tag
    └── Copy to clipboard button
```

### Implementation Steps
1. **Extend embed system** (EmbedConfig + InternalPluginHost)
2. **Create /get-started page** with 3-panel layout
3. **Add size presets** (400px, 600px, 800px, custom)
4. **Implement live preview** with real embed updates
5. **Add code generation** with copy functionality

## Page Structure
```
/get-started
├── Header: "Get Your Own Forum"
├── Configurator Panel (Left)
│   ├── Size Configuration
│   ├── Theme Selection
│   └── [Future: More options]
├── Live Preview (Center)
│   └── Real embed with current settings
└── Code Output (Right)
    ├── Generated embed code
    └── Copy button
```

## Current Embed System Study Notes

### 1. Embed Script Analysis
The embed system is sophisticated and modular:
- Built from TypeScript modules in `src/lib/embed/`
- Compiled into single `public/embed.js` file
- Uses `buildEmbedScript()` to combine all modules
- Self-contained with InternalPluginHost architecture

### 2. Data Attributes Currently Supported
Current configuration via `EmbedConfig` interface:
- `data-community` - Community identifier (nullable)
- `data-theme` - 'light' | 'dark' (defaults to 'light')
- `data-container` - Target container ID (or creates one)
- `data-height` - CSS height value (defaults to '600px')

**Missing**: `data-width` - No width configuration currently supported!

### 3. Configuration Architecture
- `parseEmbedConfig()` reads data attributes from script tag
- `validateEmbedConfig()` validates and sanitizes values
- Height validation: supports px, %, vh, em, rem units
- Container creation: finds existing or creates new at script location

### 4. Key Implementation Insights
- Script uses `document.currentScript` to read its own attributes
- Container styling is minimal (only `position: relative`)
- **Gap**: No width control, no responsive sizing options
- **Gap**: No preset size options (small/medium/large)

---

*Document updated: January 19, 2025*
*Status: Phase 1 Complete ✅*

## ✅ Phase 1 Implementation Complete

### Changes Made

#### 1. Extended EmbedConfig Interface ✅
Added `width: string` to support `data-width` attribute

#### 2. Updated EmbedConfig.ts ✅
- ✅ Parse `data-width` attribute (defaults to '100%')
- ✅ Added width validation (supports px, %, vw, em, rem)
- ✅ Updated generated JavaScript config code

#### 3. Updated InternalPluginHost.ts ✅
- ✅ Auth iframe: `iframe.style.width = this.config.width || '100%'`
- ✅ Forum iframe: `iframe.style.width = this.config.width || '100%'`
- ✅ Updated both TypeScript class and generated JavaScript

#### 4. Updated Demo Page ✅
- ✅ Added `data-width="100%"` and `data-height="100%"`
- ✅ Now truly full-screen instead of arbitrary 700px height

### New Data Attributes Available
- `data-width` - Control iframe width (px, %, vw, em, rem)
- `data-height` - Control iframe height (px, %, vh, em, rem) - enhanced
- `data-theme` - Light/Dark/Auto theming
- `data-container` - Target container ID
- `data-community` - Community identifier

### Test Results
- ✅ Embed build: 10KB (0.46s)
- ✅ Main build: 14.51s successful
- ✅ Demo page now supports full-screen iframe

**Ready for Phase 2: Build Configurator UI** 🚀 