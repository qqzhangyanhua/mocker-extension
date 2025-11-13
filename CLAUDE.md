# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an API Mocker Chrome extension built with the Plasmo framework. It intercepts and mocks HTTP requests (XMLHttpRequest and Fetch API) based on user-defined rules.

## Development Commands

```bash
# Install dependencies (use pnpm, not npm)
pnpm install

# Development mode with hot reload
pnpm dev

# Type checking
pnpm type-check

# Production build
pnpm build

# Package extension for Chrome Web Store
pnpm package
```

## Architecture

### Core Request Interception Flow

1. **Content Script (`contents/interceptor.ts`)**: Injected at `document_start` on all URLs, overrides native XMLHttpRequest and fetch APIs to intercept requests
2. **Matching Engine (`lib/matcher.ts`)**: Evaluates incoming requests against user-defined rules using exact, prefix, contains, or regex patterns
3. **Background Service Worker (`background.ts`)**: Manages configuration broadcasting and message routing between components
4. **Storage Layer (`lib/storage.ts`)**: Persists rules, scenes, configuration, and request records using Chrome storage API

### Key Architectural Decisions

- **Plasmo Framework**: Automatically handles manifest generation, content script injection, and build processes
- **Request Interception**: Uses Proxy pattern to wrap native APIs rather than webRequest API for better response manipulation
- **Message Passing**: Background script acts as central hub for configuration updates to ensure all content scripts stay synchronized
- **Type Safety**: All data structures defined in `lib/types.ts` with strict TypeScript enforcement

### Component Communication

```
User Interface (popup.tsx/options.tsx)
    ↓ Chrome Runtime Messages
Background Service Worker (background.ts)
    ↓ Broadcasts config updates
Content Scripts (contents/interceptor.ts)
    ↓ Intercepts requests
Native APIs (XMLHttpRequest/fetch)
```

## File Naming Conventions

Plasmo uses convention-based file naming:
- `popup.tsx` → Extension popup
- `options.tsx` → Options page (opens in tab)
- `background.ts` → Service worker
- `contents/*.ts` → Content scripts
- `components/*.tsx` → React components (not auto-discovered)
- `lib/*.ts` → Shared utilities (not auto-discovered)

## Build Outputs

- **Development**: `build/chrome-mv3-dev/` (includes source maps, hot reload)
- **Production**: `build/chrome-mv3-prod/` (minified, optimized)

## Configuration

- **Manifest**: Configured in `.plasmorc.ts` and `package.json` manifest field
- **TypeScript paths**: Uses `~` prefix for root imports (configured in `tsconfig.json`)
- **Permissions**: Defined in package.json, requires `storage`, `activeTab`, and `<all_urls>` host permission

## Testing Mock Rules

When testing the extension:
1. Load `build/chrome-mv3-dev` in Chrome's extension management page
2. Create rules in Options page specifying URL patterns and response data
3. Navigate to target website - requests matching rules will be intercepted
4. Check popup badge for active rule count on current page