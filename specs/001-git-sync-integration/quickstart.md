# Quickstart: Git-Based Multi-User Collaboration

**Feature**: 001-git-sync-integration
**For**: Developers implementing Git sync functionality
**Prerequisites**: Node.js 20+, Git 2.x+, GitHub Enterprise access

---

## 1. Install Dependencies

```bash
npm install simple-git@^3.0.0 zod@^3.25.0 electron-store@^10.0.0 diff@^5.0.0
```

**Dependencies**:
- `simple-git`: Git operations (clone, pull, commit, push)
- `zod`: JSON schema validation
- `electron-store`: Secure credential storage
- `diff`: 3-way merge algorithm for conflict resolution

---

## 2. Setup GitHub Enterprise Repository

### Create Data Repository

```bash
# On GitHub Enterprise
1. Navigate to your organization
2. Create new repository: "capacinator-data"
3. Initialize with README
4. Set permissions: All team members = Write access
```

### Initialize Directory Structure

```bash
git clone https://github.enterprise.com/yourorg/capacinator-data.git
cd capacinator-data

# Create directory structure
mkdir -p scenarios/working scenarios/committed master-data audit

# Create placeholder files
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/projects.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/people.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/assignments.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/project_phases.json

# Same for committed/
cp scenarios/working/*.json scenarios/committed/

# Master data
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/roles.json
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/locations.json
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/project_types.json

# Commit
git add .
git commit -m "Initialize repository structure"
git push origin main
```

---

## 3. Environment Configuration

Add to `.env.development`:

```bash
# Git Sync Feature Flag
ENABLE_GIT_SYNC=true

# GitHub Enterprise Configuration
GITHUB_ENTERPRISE_URL=https://github.enterprise.com
GIT_REPOSITORY_URL=https://github.enterprise.com/yourorg/capacinator-data.git

# Git Sync Settings
GIT_SYNC_AUTO_PULL_ON_STARTUP=true
GIT_SYNC_SHALLOW_CLONE=true
GIT_SYNC_CONFLICT_AUTO_MERGE=true  # Auto-merge non-conflicting changes
```

---

## 4. Implement GitRepositoryService

**Location**: `src/server/services/git/GitRepositoryService.ts`

```typescript
import simpleGit, { SimpleGit, CleanOptions } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

export class GitRepositoryService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async initialize(remoteUrl: string, credentials: GitCredentials): Promise<void> {
    // Check if already cloned
    const exists = await this.repositoryExists();

    if (!exists) {
      await this.clone(remoteUrl, credentials);
    } else {
      // Ensure we're on main branch
      await this.git.checkout('main');
    }
  }

  async clone(remoteUrl: string, credentials: GitCredentials): Promise<void> {
    const authUrl = this.addCredentialsToUrl(remoteUrl, credentials);

    await simpleGit().clone(authUrl, this.repoPath, {
      '--depth': 1,        // Shallow clone
      '--single-branch': null,
      '--branch': 'main'
    });

    this.git = simpleGit(this.repoPath);
  }

  async pull(): Promise<PullResult> {
    try {
      const result = await this.git.pull('origin', 'main', {
        '--rebase': 'false',  // Merge, don't rebase
        '--no-ff': null       // Always create merge commit
      });

      return {
        success: !result.summary.conflicts.length,
        filesChanged: result.files.length,
        conflicts: result.summary.conflicts
      };
    } catch (error) {
      if (error.message.includes('CONFLICT')) {
        // Parse conflicts
        const conflicts = await this.detectConflicts();
        return { success: false, filesChanged: 0, conflicts };
      }
      throw error;
    }
  }

  async commit(message: string, author: GitAuthor): Promise<string> {
    await this.git.add('./*');

    const result = await this.git.commit(message, undefined, {
      '--author': `${author.name} <${author.email}>`
    });

    return result.commit; // SHA hash
  }

  async push(credentials: GitCredentials): Promise<void> {
    const authUrl = this.addCredentialsToUrl(await this.getRemoteUrl(), credentials);

    await this.git.push(authUrl, 'main');
  }

  private async repositoryExists(): Promise<boolean> {
    try {
      await fs.access(path.join(this.repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  private addCredentialsToUrl(url: string, credentials: GitCredentials): string {
    const urlObj = new URL(url);
    urlObj.username = 'x-access-token';
    urlObj.password = credentials.token;
    return urlObj.toString();
  }

  private async getRemoteUrl(): Promise<string> {
    const remotes = await this.git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (!origin) throw new Error('No origin remote found');
    return origin.refs.fetch;
  }

  private async detectConflicts(): Promise<Conflict[]> {
    const status = await this.git.status();
    // Parse conflicted files and extract entity IDs
    // (Implementation in GitConflictResolver)
    return [];
  }
}
```

---

## 5. Implement ScenarioExporter

**Location**: `src/server/services/git/ScenarioExporter.ts`

```typescript
import { z } from 'zod';
import { Knex } from 'knex';
import fs from 'fs/promises';
import path from 'path';

export class ScenarioExporter {
  constructor(private db: Knex, private repoPath: string) {}

  async exportToJSON(scenarioId: string): Promise<void> {
    const scenarioDir = path.join(this.repoPath, `scenarios/${scenarioId}`);

    // Export projects
    const projects = await this.db('projects').select('*');
    await this.writeJSON(`${scenarioDir}/projects.json`, {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'user@example.com', // From auth context
      scenarioId,
      data: projects
    });

    // Export people
    const people = await this.db('people').select('*');
    await this.writeJSON(`${scenarioDir}/people.json`, {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'user@example.com',
      scenarioId,
      data: people
    });

    // Export assignments
    const assignments = await this.db('project_assignments').select('*');
    await this.writeJSON(`${scenarioDir}/assignments.json`, {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'user@example.com',
      scenarioId,
      data: assignments
    });

    // Export project phases
    const phases = await this.db('project_phases').select('*');
    await this.writeJSON(`${scenarioDir}/project_phases.json`, {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'user@example.com',
      scenarioId,
      data: phases
    });
  }

  async importFromJSON(scenarioId: string): Promise<void> {
    const scenarioDir = path.join(this.repoPath, `scenarios/${scenarioId}`);

    // Import projects
    const projectsData = await this.readJSON(`${scenarioDir}/projects.json`);
    await this.importProjects(projectsData.data);

    // Import people
    const peopleData = await this.readJSON(`${scenarioDir}/people.json`);
    await this.importPeople(peopleData.data);

    // Import assignments
    const assignmentsData = await this.readJSON(`${scenarioDir}/assignments.json`);
    await this.importAssignments(assignmentsData.data);

    // Import project phases
    const phasesData = await this.readJSON(`${scenarioDir}/project_phases.json`);
    await this.importProjectPhases(phasesData.data);
  }

  private async importProjects(projects: any[]): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Clear existing
      await trx('projects').del();

      // Bulk insert
      if (projects.length > 0) {
        await trx.batchInsert('projects', projects, 100);
      }
    });
  }

  // Similar methods for importPeople, importAssignments, importProjectPhases

  private async writeJSON(filePath: string, data: any): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async readJSON(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }
}
```

---

## 6. Create Sync Controller

**Location**: `src/server/api/controllers/GitSyncController.ts`

```typescript
import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { GitRepositoryService } from '../../services/git/GitRepositoryService.js';
import { ScenarioExporter } from '../../services/git/ScenarioExporter.js';

export class GitSyncController extends BaseController {
  constructor(
    private gitService: GitRepositoryService,
    private exporter: ScenarioExporter
  ) {
    super({ enableLogging: true });
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.gitService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.handleError(error, req, res, 'Failed to get sync status');
    }
  }

  async pull(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.gitService.pull();

      if (result.success) {
        // Rebuild SQLite cache from pulled JSON
        await this.exporter.importFromJSON('working');
      }

      res.json({
        success: result.success,
        data: {
          filesChanged: result.filesChanged,
          conflictsDetected: result.conflicts.length,
          conflicts: result.conflicts
        }
      });
    } catch (error) {
      this.handleError(error, req, res, 'Failed to pull updates');
    }
  }

  async push(req: Request, res: Response): Promise<void> {
    try {
      const { commitMessage } = req.body;

      // Export SQLite to JSON
      await this.exporter.exportToJSON('working');

      // Commit
      const author = { name: req.authUser.name, email: req.authUser.email };
      const message = commitMessage || this.generateCommitMessage();
      const commitSha = await this.gitService.commit(message, author);

      // Push
      await this.gitService.push(req.gitCredentials);

      res.json({
        success: true,
        data: {
          commitSha,
          filesChanged: 4, // projects, people, assignments, phases
          commitMessage: message
        }
      });
    } catch (error) {
      this.handleError(error, req, res, 'Failed to push changes');
    }
  }

  private generateCommitMessage(): string {
    // Auto-generate based on changed entities
    return `Updated scenario data (${new Date().toISOString()})`;
  }
}
```

---

## 7. Add Routes

**Location**: `src/server/api/routes/sync.ts`

```typescript
import { Router } from 'express';
import { GitSyncController } from '../controllers/GitSyncController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requireGitAuth } from '../../middleware/gitAuthMiddleware.js';

const router = Router();

// Inject dependencies
const controller = new GitSyncController(gitService, exporter);

router.get('/status', requireAuth(), controller.getStatus.bind(controller));
router.post('/pull', requireAuth(), requireGitAuth(), controller.pull.bind(controller));
router.post('/push', requireAuth(), requireGitAuth(), controller.push.bind(controller));

export default router;
```

Register in `src/server/index.ts`:

```typescript
import syncRoutes from './api/routes/sync.js';

app.use('/api/sync', syncRoutes);
```

---

## 8. Frontend Integration

**Add GitSyncContext**:

```typescript
// client/src/contexts/GitSyncContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface GitSyncContextType {
  status: 'synced' | 'pending' | 'syncing' | 'conflict' | 'offline';
  pendingCount: number;
  sync: () => Promise<void>;
  pull: () => Promise<void>;
}

const GitSyncContext = createContext<GitSyncContextType | null>(null);

export const GitSyncProvider: React.FC = ({ children }) => {
  const [status, setStatus] = useState<'synced' | 'pending' | 'syncing' | 'conflict' | 'offline'>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  const sync = async () => {
    setStatus('syncing');
    try {
      await api.sync.push();
      setStatus('synced');
    } catch (error) {
      setStatus('conflict');
    }
  };

  const pull = async () => {
    setStatus('syncing');
    try {
      await api.sync.pull();
      setStatus('synced');
    } catch (error) {
      setStatus('conflict');
    }
  };

  return (
    <GitSyncContext.Provider value={{ status, pendingCount, sync, pull }}>
      {children}
    </GitSyncContext.Provider>
  );
};

export const useGitSync = () => {
  const context = useContext(GitSyncContext);
  if (!context) throw new Error('useGitSync must be used within GitSyncProvider');
  return context;
};
```

**Add Sync Button**:

```typescript
// client/src/components/sync/SyncButton.tsx
export const SyncButton: React.FC = () => {
  const { status, sync } = useGitSync();

  return (
    <button
      onClick={sync}
      disabled={status === 'syncing'}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {status === 'syncing' ? 'Syncing...' : 'Save & Sync'}
    </button>
  );
};
```

---

## 9. Testing

**Unit Test Example**:

```typescript
// tests/unit/services/git/GitRepositoryService.test.ts
import { GitRepositoryService } from '../../../../src/server/services/git/GitRepositoryService.js';
import simpleGit from 'simple-git';

jest.mock('simple-git');

describe('GitRepositoryService', () => {
  let service: GitRepositoryService;
  let mockGit: any;

  beforeEach(() => {
    mockGit = {
      clone: jest.fn(),
      pull: jest.fn(),
      commit: jest.fn(),
      push: jest.fn()
    };
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    service = new GitRepositoryService('/tmp/test-repo');
  });

  test('should clone repository with shallow clone', async () => {
    await service.clone('https://github.com/test/repo.git', { token: 'test' });

    expect(mockGit.clone).toHaveBeenCalledWith(
      expect.stringContaining('x-access-token'),
      '/tmp/test-repo',
      expect.objectContaining({ '--depth': 1 })
    );
  });
});
```

---

## 10. Migration Script

**Create one-time migration tool**:

```bash
npm run migrate:to-git -- --database=capacinator-dev.db --output=../capacinator-data
```

See `scripts/migrate-to-git.ts` for implementation.

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Create GitHub Enterprise repository
3. ✅ Implement GitRepositoryService
4. ✅ Implement ScenarioExporter
5. ✅ Add API routes
6. ✅ Add frontend context and UI
7. ✅ Write tests
8. ⏭️ Run migration script
9. ⏭️ Test with pilot users

**Documentation**: See [data-model.md](./data-model.md) for entity mappings and [sync-api.yaml](./contracts/sync-api.yaml) for API specs.
