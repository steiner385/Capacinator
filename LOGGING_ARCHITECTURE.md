# Enhanced Logging Architecture

## Overview
This document describes the enhanced logging architecture implemented for Capacinator, providing structured, secure, and performant logging across both server and client sides.

## Architecture Components

### Server-Side Logging

#### 1. Core Logger Service (`/src/server/services/logging/Logger.ts`)
- **Structured Logging**: JSON-formatted logs in production, human-readable in development
- **Multiple Log Levels**: ERROR, WARN, INFO, HTTP, DEBUG
- **Contextual Logging**: Request correlation, user tracking, performance metrics
- **Security**: Automatic redaction of sensitive fields
- **Child Loggers**: Inherit parent context while adding specific metadata

#### 2. Configuration (`/src/server/services/logging/config.ts`)
- **Environment-Aware**: Different configs for dev/test/prod
- **Configurable Redaction**: Customizable sensitive field filtering
- **Performance Tuning**: File rotation, size limits, retention policies

#### 3. Enhanced Middleware

##### Request Logging (`/src/server/middleware/requestLogger.ts`)
- **Request Correlation**: Unique request IDs for tracing
- **Performance Monitoring**: Automatic slow request detection
- **User Context**: Automatic user information capture

##### Error Handling (`/src/server/middleware/enhancedErrorHandler.ts`)
- **Operational vs System Errors**: Different handling strategies
- **Global Error Capture**: Unhandled rejections and exceptions
- **Graceful Shutdown**: Proper cleanup on process termination

##### Audit Integration (`/src/server/middleware/enhancedAuditMiddleware.ts`)
- **Automatic Audit Logging**: HTTP method-based audit events
- **Bulk Operations**: Efficient logging for batch operations
- **Context Tracking**: Entity change tracking throughout request lifecycle

#### 4. Enhanced Base Controller (`/src/server/api/controllers/EnhancedBaseController.ts`)
- **Consistent Error Handling**: Standardized error responses
- **Performance Logging**: Automatic slow query detection
- **Business Operation Logging**: Structured business event logging
- **Async Safety**: Proper promise handling and error propagation

### Client-Side Logging

#### 1. Client Logger (`/client/src/services/logger.ts`)
- **Production-Safe**: Minimal logging in production unless debug enabled
- **Error Boundary Integration**: Automatic React error capture
- **Remote Logging**: Buffered transmission to server
- **Performance Monitoring**: Client-side performance tracking
- **Session Tracking**: User session correlation

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info                    # error|warn|info|http|debug
LOG_FORMAT=json                   # json|human (auto-detects in dev)
LOG_DIRECTORY=/tmp/capacinator-logs
LOG_MAX_FILE_SIZE=10485760       # 10MB
LOG_MAX_FILES=10                 # Keep last 10 log files
SERVICE_NAME=capacinator         # Service identifier
ENABLE_TEST_LOGS=false           # Enable logging in tests

# Audit Configuration (inherited)
AUDIT_ENABLED=true
AUDIT_SENSITIVE_FIELDS=password,token,secret,key,hash
```

## Usage Examples

### Server-Side Usage

#### Basic Logging
```typescript
import { logger } from '../services/logging/config.js';

// Basic logging
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database connection failed', error, { database: 'main' });

// Performance logging
logger.logPerformance('User query', 1500, { userId: '123', queryType: 'complex' });

// Business operation logging
logger.logBusinessOperation('CREATE', 'project', 'proj-123', 'user-456', {
  projectName: 'New Project',
  department: 'Engineering'
});
```

#### Controller Usage
```typescript
export class ProjectsController extends EnhancedBaseController {
  createProject = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const startTime = Date.now();
    
    try {
      // Log business operation
      this.logBusinessOperation(req, 'CREATE', 'project', 'new', {
        projectData: req.body
      });

      const project = await this.executeQuery(
        () => this.db('projects').insert(req.body).returning('*'),
        req,
        res,
        'Failed to create project'
      );

      // Log audit event
      await req.logAuditEvent('projects', project.id, 'CREATE', undefined, project);

      this.sendSuccess(req, res, project, 'Project created successfully');
      
    } catch (error) {
      throw this.createOperationalError('Failed to create project', 400);
    }
  });
}
```

#### Request Middleware Setup
```typescript
// In app.ts
import { requestLoggerMiddleware, userContextMiddleware } from './middleware/requestLogger.js';
import { enhancedAuditMiddleware } from './middleware/enhancedAuditMiddleware.js';
import { enhancedErrorHandler, setupGlobalErrorHandlers } from './middleware/enhancedErrorHandler.js';

// Setup global error handlers
setupGlobalErrorHandlers();

// Apply middleware
app.use(requestLoggerMiddleware);
app.use(userContextMiddleware);
app.use(enhancedAuditMiddleware);

// Apply error handler last
app.use(enhancedErrorHandler);
```

### Client-Side Usage

#### Basic Logging
```typescript
import { logger } from '../services/logger';

// Component logging
const componentLogger = logger.child({ component: 'ProjectList' });

// User action logging
componentLogger.logUserAction('CREATE_PROJECT', { projectType: 'software' });

// Error logging
componentLogger.error('Failed to load projects', { error: apiError });

// Performance logging
componentLogger.logPerformance('Component Render', renderTime, { componentCount: 25 });
```

#### React Component Integration
```typescript
import { withErrorLogging, logger } from '../services/logger';

class ProjectListComponent extends React.Component {
  componentDidMount() {
    const logger = logger.child({ component: 'ProjectList' });
    logger.info('Component mounted');
  }

  handleCreateProject = async () => {
    const startTime = Date.now();
    try {
      await this.createProject();
      logger.logUserAction('CREATE_PROJECT');
    } catch (error) {
      logger.error('Project creation failed', { error });
    }
  };
}

// Wrap with error logging
export default withErrorLogging(ProjectListComponent, 'ProjectList');
```

## Log Output Examples

### Development (Human-Readable)
```
ℹ️  [14:30:15] Server starting on port 3456
🌐 [14:30:20] HTTP Request - GET /api/projects - 200 - 45ms
⚠️  [14:30:25] Slow request detected - GET /api/reports/complex - 1500ms
❌ [14:30:30] Database error - SQLITE_ERROR: table not found
```

### Production (Structured JSON)
```json
{
  "timestamp": "2025-01-15T14:30:15.123Z",
  "level": "INFO",
  "message": "HTTP Request",
  "service": "capacinator",
  "requestId": "req-123-456",
  "userId": "user-789",
  "metadata": {
    "method": "GET",
    "url": "/api/projects",
    "statusCode": 200,
    "duration": "45ms",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.100"
  }
}
```

## Security Considerations

### Automatic Data Redaction
```typescript
// These fields are automatically redacted:
const sensitiveFields = [
  'password', 'token', 'secret', 'key', 'hash',
  'authorization', 'cookie', 'jwt', 'session',
  'credit_card', 'ssn', 'email', 'phone'
];

// Example redacted log:
{
  "user": {
    "id": "123",
    "email": "[REDACTED]",
    "password": "[REDACTED]",
    "name": "John Doe"
  }
}
```

### Production Safety
- **Error Details**: Internal error details hidden in production
- **Stack Traces**: Only included in development
- **Client Logging**: Minimal in production unless debug enabled
- **Log Shipping**: Buffered transmission with failure resilience

## Performance Optimizations

### Server-Side
- **Lazy Evaluation**: Log formatting only happens if level threshold met
- **Async Operations**: Non-blocking log writes
- **Memory Management**: Automatic cleanup of old log entries
- **Query Performance**: Automatic slow query detection and logging

### Client-Side
- **Production Filtering**: Minimal logging overhead in production
- **Buffered Transmission**: Batched log shipping to reduce network calls
- **Memory Limits**: Automatic buffer size management
- **Error Priority**: Immediate transmission of critical errors

## Monitoring and Alerting

### Key Metrics to Monitor
- **Error Rate**: Percentage of requests resulting in errors
- **Response Time**: 95th percentile response times
- **Slow Queries**: Database operations over threshold
- **Client Errors**: Unhandled exceptions and failed API calls
- **Audit Events**: Business operation tracking

### Alert Conditions
```typescript
// Example alert conditions
- Error rate > 5% over 5 minutes
- 95th percentile response time > 1000ms
- Database query time > 5000ms
- Unhandled exceptions > 0
- Failed audit logging > 0
```

## Migration Strategy

### Phase 1: Enhanced Server Logging ✅
- [x] Implement new Logger service
- [x] Create enhanced middleware
- [x] Update BaseController
- [x] Add configuration management

### Phase 2: Client Logging ✅
- [x] Implement client logger
- [x] Add React error boundaries
- [x] Create remote logging endpoint

### Phase 3: Production Deployment
- [ ] Update environment configurations
- [ ] Apply new middleware to existing routes
- [ ] Migrate controllers to EnhancedBaseController
- [ ] Set up log aggregation and monitoring

### Phase 4: Optimization
- [ ] Implement file-based logging with rotation
- [ ] Add log aggregation service (ELK/Grafana)
- [ ] Set up automated alerting
- [ ] Performance tuning based on production metrics

## Benefits

1. **Operational Visibility**: Complete request tracing and performance monitoring
2. **Security**: Automatic sensitive data redaction and secure error handling
3. **Debugging**: Structured logs with correlation IDs and contextual information
4. **Performance**: Automatic slow operation detection and optimization opportunities
5. **Compliance**: Enhanced audit trail with business operation tracking
6. **Reliability**: Graceful error handling and system health monitoring
7. **Scalability**: Configurable logging levels and efficient resource usage

This enhanced logging architecture provides a solid foundation for production operations while maintaining developer productivity and system security.