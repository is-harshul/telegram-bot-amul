# @ Alias Configuration

This project is configured with TypeScript path aliases using the `@` symbol for cleaner imports.

## Configuration

The `@` alias is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/services/*": ["services/*"],
      "@/config/*": ["config/*"],
      "@/types/*": ["types/*"]
    }
  }
}
```

## Usage Examples

### Before (without @ alias):
```typescript
import redis from '../redis';
import { CacheService } from '../services/cache';
import { DatabaseService } from '../services/databaseService';
import { config } from '../config';
import { BotConfig } from '../types';
```

### After (with @ alias):
```typescript
import redis from '@/redis';
import { CacheService } from '@/services/cache';
import { DatabaseService } from '@/services/databaseService';
import { config } from '@/config';
import { BotConfig } from '@/types';
```

## Available Aliases

- `@/` - Points to `src/`
- `@/services/` - Points to `src/services/`
- `@/config/` - Points to `src/config/`
- `@/types/` - Points to `src/types/`

## Redis Configuration

The project includes a Redis configuration at `src/redis.ts` that can be imported using:

```typescript
import redis from '@/redis';
```

### Redis Features

- **Connection Management**: Automatic connection and reconnection
- **Error Handling**: Comprehensive error handling and logging
- **Helper Functions**: Convenient wrapper functions for common operations
- **Environment Configuration**: Uses `REDIS_URL` environment variable

### Redis Helper Functions

```typescript
// Basic operations
await redis.set('key', 'value', 60); // Set with expiration
const value = await redis.get('key');
await redis.del('key');

// Cache operations
await cacheService.cacheUserSelection(userId, productId, productName, productUrl);
const selection = await cacheService.getUserSelection(userId);

// Stock status caching
await cacheService.cacheStockStatus(productId, status);
const status = await cacheService.getStockStatus(productId);

// Notification cooldown
await cacheService.setNotificationCooldown(userId, productId);
const inCooldown = await cacheService.isNotificationInCooldown(userId, productId);
```

## Environment Variables

Add to your `.env` file:

```env
REDIS_URL=redis://localhost:6379
```

## Testing the Alias

You can test the `@` alias configuration by running:

```bash
npx tsc --noEmit
```

This will check if all imports using the `@` alias are working correctly.

## Benefits

1. **Cleaner Imports**: No more long relative paths like `../../../services/`
2. **Better Maintainability**: Easy to move files without breaking imports
3. **IDE Support**: Better autocomplete and navigation
4. **Consistency**: Standardized import patterns across the project

## Troubleshooting

If the `@` alias is not working:

1. Make sure `tsconfig.json` has the correct `baseUrl` and `paths` configuration
2. Restart your TypeScript language server in your IDE
3. Check that the file paths in the `paths` configuration are correct
4. Ensure you're using TypeScript 2.9+ for path mapping support 