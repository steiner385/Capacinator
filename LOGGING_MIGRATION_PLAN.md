# Logging Architecture Migration Plan

## Overview
This document outlines the step-by-step migration from the current console-based logging to the enhanced structured logging architecture.

## Current State Analysis

### Issues with Current Logging
- ❌ **411 console.log statements** across 57 server files
- ❌ **151 console.log statements** across 33 client files
- ❌ **No structured logging** - difficult to parse and analyze
- ❌ **No log levels** - everything logged at same priority
- ❌ **Security risks** - sensitive data potentially exposed
- ❌ **Performance impact** - synchronous console operations
- ❌ **No request correlation** - difficult to trace requests
- ❌ **Inconsistent error handling** - ad-hoc error responses

### Current Strengths to Preserve
- ✅ **Comprehensive audit system** with undo capabilities
- ✅ **Environment-aware configuration** 
- ✅ **Visual categorization** with emoji prefixes
- ✅ **Good error context** in BaseController
- ✅ **Log file management** scripts already in place

## Migration Strategy

### Phase 1: Foundation Setup (Week 1) ✅
**Status: COMPLETED**

- [x] Create enhanced Logger service
- [x] Create logging configuration system
- [x] Create enhanced middleware (request, error, audit)
- [x] Create EnhancedBaseController
- [x] Create client-side logger
- [x] Document new architecture

### Phase 2: Server Infrastructure (Week 2)

#### 2.1 Update Application Bootstrap
**File:** `/src/server/index.ts`

```typescript
// Add at the top
import { setupGlobalErrorHandlers } from './middleware/enhancedErrorHandler.js';
import { logger } from './services/logging/config.js';

// Replace existing console.log statements
// Before:
console.log('🚀 Starting Capacinator server...');

// After:
logger.info('Starting Capacinator server', { 
  port: PORT, 
  environment: process.env.NODE_ENV 
});

// Add global error setup
setupGlobalErrorHandlers();
```

#### 2.2 Update Express App Configuration
**File:** `/src/server/app.ts`

```typescript
// Add enhanced middleware
import { requestLoggerMiddleware, userContextMiddleware } from './middleware/requestLogger.js';
import { enhancedAuditMiddleware } from './middleware/enhancedAuditMiddleware.js';
import { enhancedErrorHandler } from './middleware/enhancedErrorHandler.js';

// Apply middleware in correct order
app.use(requestLoggerMiddleware);      // First - add request ID and timing
app.use(userContextMiddleware);        // After auth - add user context
app.use(enhancedAuditMiddleware);      // Add audit helpers

// Routes go here...

app.use(enhancedErrorHandler);         // Last - catch all errors
```

#### 2.3 Update Environment Configuration
**File:** `.env.example` additions

```bash
# Enhanced Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=human                    # human|json
LOG_DIRECTORY=/tmp/capacinator-logs
LOG_MAX_FILE_SIZE=10485760         # 10MB
LOG_MAX_FILES=10
SERVICE_NAME=capacinator
ENABLE_TEST_LOGS=false

# Client Logging
ENABLE_CLIENT_REMOTE_LOGGING=true
CLIENT_LOG_ENDPOINT=/api/client-logs
```

### Phase 3: Controller Migration (Week 3)

#### 3.1 Migrate Critical Controllers First
**Priority Order:**
1. `AuthController` - Authentication logging is critical
2. `ProjectsController` - High-traffic controller
3. `AssignmentsController` - Business-critical operations
4. `ReportingController` - Performance-sensitive

#### 3.2 Migration Template
**Example: ProjectsController**

```typescript
// Before: ProjectsController extends BaseController
export class ProjectsController extends EnhancedBaseController {
  // Replace:
  // console.log('Creating project...'); 
  
  // With:
  createProject = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Creating project', { 
      userId: req.user?.id,
      projectData: req.body 
    });

    const project = await this.executeQuery(
      () => this.db('projects').insert(req.body).returning('*'),
      req,
      res,
      'Failed to create project'
    );

    if (project) {
      await req.logAuditEvent('projects', project.id, 'CREATE', undefined, project);
      this.logBusinessOperation(req, 'CREATE', 'project', project.id);
      this.sendSuccess(req, res, project, 'Project created successfully');
    }
  });
}
```

#### 3.3 Automated Migration Script

```bash
#!/bin/bash
# migrate-controller.sh - Helper script to migrate a controller

CONTROLLER_FILE=$1
BACKUP_FILE="${CONTROLLER_FILE}.backup"

echo "Migrating controller: $CONTROLLER_FILE"

# Create backup
cp "$CONTROLLER_FILE" "$BACKUP_FILE"

# Replace BaseController with EnhancedBaseController
sed -i 's/extends BaseController/extends EnhancedBaseController/g' "$CONTROLLER_FILE"

# Replace console.log with logger calls (requires manual review)
grep -n "console\.log" "$CONTROLLER_FILE" > "${CONTROLLER_FILE}.console-logs.txt"

echo "Backup created: $BACKUP_FILE"
echo "Console.log statements found in: ${CONTROLLER_FILE}.console-logs.txt"
echo "Please manually replace console.log statements with appropriate logger calls"
```

### Phase 4: Database and Service Migration (Week 4)

#### 4.1 Database Operations
**Files to migrate:**
- `/src/server/database/migrate.ts`
- `/src/server/database/seed.ts`
- `/src/server/database/index.ts`

**Migration approach:**
```typescript
// Replace migration console.logs
// Before:
console.log('📊 Running migrations...');

// After:
import { logger } from '../services/logging/config.js';
logger.info('Running database migrations', { 
  environment: process.env.NODE_ENV 
});
```

#### 4.2 Background Services
**Files to migrate:**
- `/src/server/services/NotificationScheduler.ts`
- `/src/server/services/backup/scheduler.ts`
- `/src/server/services/EmailService.ts`

### Phase 5: Client-Side Migration (Week 5)

#### 5.1 API Client Enhancement
**File:** `/client/src/lib/api-client.ts`

```typescript
import { logger } from '../services/logger';

export class ApiClient {
  async request(method: string, url: string, data?: any) {
    const startTime = Date.now();
    const requestLogger = logger.child({ component: 'ApiClient' });

    try {
      const response = await fetch(url, { method, body: JSON.stringify(data) });
      const duration = Date.now() - startTime;
      
      requestLogger.logApiCall(method, url, duration, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      requestLogger.error('API request failed', { 
        method, 
        url, 
        error,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
}
```

#### 5.2 Component Migration Priority
1. **High-traffic components**: `ProjectList`, `AssignmentModal`, `Dashboard`
2. **Error-prone components**: `Import`, `Reports`, `PhaseManager`
3. **Performance-critical**: `InteractiveTimeline`, `Charts`

#### 5.3 React Component Template
```typescript
import { logger } from '../services/logger';

const ProjectList: React.FC = () => {
  const componentLogger = logger.child({ component: 'ProjectList' });
  
  useEffect(() => {
    componentLogger.info('Component mounted');
  }, []);

  const handleCreateProject = async () => {
    try {
      componentLogger.logUserAction('CREATE_PROJECT_CLICKED');
      await createProject();
      componentLogger.info('Project created successfully');
    } catch (error) {
      componentLogger.error('Failed to create project', { error });
    }
  };

  return (
    // Component JSX
  );
};

export default withErrorLogging(ProjectList, 'ProjectList');
```

### Phase 6: Testing and Validation (Week 6)

#### 6.1 Update Test Configuration
**File:** `/jest.config.cjs`

```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node',
  globals: {
    'process.env': {
      LOG_LEVEL: 'error',  // Minimal logging in tests
      ENABLE_TEST_LOGS: 'false'
    }
  }
};
```

#### 6.2 Test Migration
```typescript
// Update test files to use new logger
import { logger } from '../../../src/server/services/logging/config.js';

describe('ProjectsController', () => {
  beforeEach(() => {
    // Spy on logger instead of console
    jest.spyOn(logger, 'info');
    jest.spyOn(logger, 'error');
  });

  it('should log project creation', async () => {
    await controller.createProject(req, res);
    expect(logger.info).toHaveBeenCalledWith(
      'Creating project',
      expect.objectContaining({ userId: 'test-user' })
    );
  });
});
```

### Phase 7: Production Deployment (Week 7)

#### 7.1 Environment Setup
```bash
# Production environment variables
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_DIRECTORY=/var/log/capacinator
ENABLE_CLIENT_REMOTE_LOGGING=true
SERVICE_NAME=capacinator-prod
```

#### 7.2 Log Rotation Setup
```bash
# /etc/logrotate.d/capacinator
/var/log/capacitor/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 app app
    postrotate
        systemctl reload capacinator || true
    endscript
}
```

#### 7.3 Monitoring Setup
```yaml
# prometheus.yml
- job_name: 'capacinator'
  static_configs:
    - targets: ['localhost:3456']
  metrics_path: '/api/metrics'
  scrape_interval: 15s
```

### Phase 8: Cleanup and Optimization (Week 8)

#### 8.1 Remove Legacy Logging
```bash
#!/bin/bash
# cleanup-console-logs.sh
find src/ -name "*.ts" -exec grep -l "console\." {} \; > files-with-console.txt
echo "Files still using console logging:"
cat files-with-console.txt
```

#### 8.2 Performance Optimization
- Enable file-based logging with rotation
- Set up log shipping to centralized system
- Configure automated alerts
- Optimize log levels for production

## Testing Strategy

### 8.1 Automated Testing
```typescript
// Test logging functionality
describe('Enhanced Logging', () => {
  it('should log requests with correlation ID', async () => {
    const response = await request(app)
      .get('/api/projects')
      .expect(200);
    
    expect(response.body.requestId).toBeDefined();
  });

  it('should redact sensitive information', () => {
    const logEntry = logger.formatLogEntry(LogLevel.INFO, 'Test', {
      user: { password: 'secret123', name: 'John' }
    });
    
    expect(logEntry.metadata.user.password).toBe('[REDACTED]');
    expect(logEntry.metadata.user.name).toBe('John');
  });
});
```

### 8.2 Load Testing
```bash
# Test logging performance under load
npx artillery run load-test.yml
```

## Risk Mitigation

### High-Risk Items
1. **Performance Impact**: Monitor response times during migration
2. **Log Volume**: Start with higher log levels, gradually increase verbosity
3. **Disk Space**: Ensure adequate storage for log files
4. **Backward Compatibility**: Maintain existing audit functionality

### Rollback Plan
1. Keep backup of original files
2. Feature flags for new logging
3. Ability to revert to console logging
4. Database rollback for audit schema changes

## Success Metrics

### Before Migration
- 562 total console.log statements
- No structured logging
- No request correlation
- Manual log analysis only

### After Migration
- 95% reduction in console.log usage
- 100% structured logging in production
- Request correlation across all operations
- Automated monitoring and alerting
- Sub-100ms logging overhead
- Zero sensitive data exposure in logs

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 ✅ | Foundation | Logger service, middleware, documentation |
| 2 | Infrastructure | App bootstrap, middleware integration |
| 3 | Controllers | Migrate critical controllers |
| 4 | Services | Database and background services |
| 5 | Client | React components and API client |
| 6 | Testing | Test updates and validation |
| 7 | Deployment | Production setup and monitoring |
| 8 | Cleanup | Legacy removal and optimization |

This migration plan ensures a gradual, low-risk transition to enhanced logging while maintaining system stability and improving operational capabilities.