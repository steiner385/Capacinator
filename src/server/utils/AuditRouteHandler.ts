import { Express } from 'express';
import { AuditService } from '../services/audit/AuditService.js';
import { createAuditRoutes } from '../api/routes/audit.js';

export class AuditRouteHandler {
  constructor(private auditService: AuditService) {}

  register(app: Express) {
    // Create and mount audit routes
    const auditRoutes = createAuditRoutes(this.auditService);
    app.use('/api/audit', auditRoutes);
  }
}