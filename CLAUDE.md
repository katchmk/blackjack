# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
pnpm dev        # Start development server with HMR
pnpm build      # Type check with tsc and build for production
pnpm lint       # Run ESLint on the codebase
pnpm preview    # Preview production build locally
```

## Tech Stack

- **React 19** with React Compiler enabled (via babel-plugin-react-compiler)
- **TypeScript** with strict mode and bundler module resolution
- **Vite 7** for development and building
- **XState** for state machine management (available but not yet implemented)
- **pnpm** as package manager

## Project Notes

- React Compiler is enabled in `vite.config.ts` which handles automatic memoization but may impact dev/build performance
- TypeScript uses project references (`tsconfig.app.json` for src, `tsconfig.node.json` for config files)
- ESLint uses flat config format with react-hooks and react-refresh plugins
