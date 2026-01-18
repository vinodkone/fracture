# Fracture - Project Guidelines

## Overview
Fracture is a Splitwise-like bill splitting app built with Next.js 14+, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Storage**: JSON files in `/data` directory
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Testing**: Jest (unit/integration), Playwright (e2e)

## Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/
│   ├── ui/                 # Reusable UI components (Button, Card, Input)
│   └── features/           # Feature-specific components
├── lib/
│   ├── db/                 # JSON file CRUD operations
│   └── algorithms/         # Balance calculation and debt simplification
└── types/                  # TypeScript types and Zod schemas
data/                       # JSON data files (members, groups, expenses, settlements)
```

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run unit and integration tests
- `npm run test:e2e` - Run Playwright e2e tests

## Conventions
- Store monetary amounts in **cents** (integers) to avoid floating-point issues
- Use Zod schemas for all API input validation
- All IDs are UUIDs
- Dates stored as ISO 8601 strings

## Git Workflow
- **Only commit code when build and tests pass**
- Run `npm run build` and `npm test` before every commit
- Make incremental commits that are buildable and testable
- Push to GitHub after each successful commit
