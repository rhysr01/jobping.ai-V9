# Contributing to JobPing

Thanks for your interest in contributing! �

## Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/jobping.git
cd jobping

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Add your API keys to .env

# 4. Start development
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Before Committing

Run these checks:

```bash
# TypeScript
npm run type-check

# Tests
npm test

# Linting
npm run lint
```

All must pass before opening a PR.

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types
- Explicit return types for functions

### Validation

- Use Zod for all input validation
- Import from `@/lib/schemas`

### Error Handling

- Use `asyncHandler` wrapper for API routes
- Throw custom errors (`ValidationError`, `NotFoundError`, etc.)
- Import from `@/lib/errors`

### Logging

- Use `logger` from `@/lib/monitoring`
- Log user actions with `logUserAction()`
- Never use `console.log` in production code

### Import Paths

We use a consistent import path convention:

- **`@/lib/`** - Shared utilities, types, config, and infrastructure
  - Examples: `@/lib/errors`, `@/lib/monitoring`, `@/lib/types`, `@/lib/database.types`
  - Use for: Error handling, logging, type definitions, database types, schemas, constants

- **`@/Utils/`** - Business logic, services, and domain-specific code
  - Examples: `@/Utils/databasePool`, `@/Utils/matching/`, `@/Utils/email/`
  - Use for: Database clients, matching services, email services, business logic

**Guidelines:**

- If it's shared infrastructure → `@/lib/`
- If it's business/domain logic → `@/Utils/`
- When in doubt, ask or check existing patterns in the codebase

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### E2E Tests

```bash
npm run test:e2e
```

## Submitting PRs

1. **Create feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write tests for new functionality
   - Update documentation if needed
   - Follow code style above

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

4. **Push and open PR**
   ```bash
   git push origin feature/your-feature-name
   ```

   - Open PR on GitHub
   - Describe what you changed and why
   - Link related issues

## Commit Convention

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

Examples:

```bash
git commit -m "feat: add promo code validation"
git commit -m "fix: prevent duplicate job matches"
git commit -m "docs: update API documentation"
```

## Questions?

- Open an issue
- Email: engineering@getjobping.com

Thanks for contributing!
