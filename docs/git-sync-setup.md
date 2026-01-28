# Git Sync Setup Guide for Administrators

This guide walks administrators through setting up Git-based multi-user collaboration for Capacinator.

## Overview

Git Sync enables multiple users to work on capacity planning data simultaneously by storing scenario data in a Git repository (GitHub Enterprise). Changes are synchronized through Git's version control system, with automatic conflict detection and resolution.

## Prerequisites

### Server Requirements
- Node.js 20+
- Git 2.x+ installed and accessible
- 500MB+ free disk space for repository data
- Network access to GitHub Enterprise server

### GitHub Enterprise Requirements
- GitHub Enterprise account with repository creation permissions
- Personal Access Token (PAT) with `repo` scope
- Network connectivity to GitHub Enterprise server

## Step 1: Create GitHub Enterprise Repository

1. Log in to your GitHub Enterprise instance
2. Create a new repository:
   - Name: `capacinator-data` (or your preferred name)
   - Visibility: Private (recommended for sensitive planning data)
   - Initialize with README: Yes
3. Note the repository URL (e.g., `https://github.enterprise.com/yourorg/capacinator-data.git`)

## Step 2: Initialize Repository Structure

Clone the repository and set up the directory structure:

```bash
git clone https://github.enterprise.com/yourorg/capacinator-data.git
cd capacinator-data

# Create directory structure
mkdir -p scenarios/working scenarios/committed master-data audit

# Create initial data files
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/projects.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/people.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/assignments.json
echo '{"schemaVersion": "1.0.0", "data": []}' > scenarios/working/project_phases.json

# Copy to committed scenario
cp scenarios/working/*.json scenarios/committed/

# Create master data files
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/roles.json
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/locations.json
echo '{"schemaVersion": "1.0.0", "data": []}' > master-data/project_types.json

# Commit structure
git add .
git commit -m "Initialize repository structure"
git push origin main
```

## Step 3: Configure Capacinator Environment

Add the following environment variables to your `.env.development` or `.env.production` file:

```bash
# Git Sync Feature Flag
ENABLE_GIT_SYNC=true

# GitHub Enterprise Configuration
GITHUB_ENTERPRISE_URL=https://github.enterprise.com
GIT_REPOSITORY_URL=https://github.enterprise.com/yourorg/capacinator-data.git

# Git Sync Settings
GIT_SYNC_AUTO_PULL_ON_STARTUP=true
GIT_SYNC_SHALLOW_CLONE=true
GIT_SYNC_CONFLICT_AUTO_MERGE=true
```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_GIT_SYNC` | Enable/disable Git sync feature | `false` |
| `GITHUB_ENTERPRISE_URL` | Base URL for GitHub Enterprise | Required |
| `GIT_REPOSITORY_URL` | Full URL to data repository | Required |
| `GIT_SYNC_AUTO_PULL_ON_STARTUP` | Auto-pull changes on app start | `true` |
| `GIT_SYNC_SHALLOW_CLONE` | Use shallow clone (saves space) | `true` |
| `GIT_SYNC_CONFLICT_AUTO_MERGE` | Auto-merge non-conflicting changes | `true` |

## Step 4: Generate Personal Access Token

Each user needs a Personal Access Token (PAT) for authentication:

1. Navigate to GitHub Enterprise: `Settings > Developer settings > Personal access tokens`
2. Click "Generate new token"
3. Configure:
   - Note: `Capacinator Git Sync`
   - Expiration: 90 days (recommended)
   - Scopes: Check `repo` (Full control of private repositories)
4. Click "Generate token"
5. Copy the token immediately (it won't be shown again)

### Token Security Best Practices

- Store tokens securely (Capacinator encrypts them locally)
- Set reasonable expiration dates
- Revoke tokens when users leave the team
- Use separate tokens for each user

## Step 5: Migrate Existing Data (Optional)

If you have existing data in Capacinator's local SQLite database, use the migration script:

```bash
# Preview what will be migrated
npx ts-node scripts/migrate-to-git.ts \
  --database=capacinator-dev.db \
  --output=../capacinator-data \
  --dry-run \
  --verbose

# Run the migration
npx ts-node scripts/migrate-to-git.ts \
  --database=capacinator-dev.db \
  --output=../capacinator-data \
  --init-git
```

Then push the migrated data:

```bash
cd ../capacinator-data
git remote add origin https://github.enterprise.com/yourorg/capacinator-data.git
git push -u origin main
```

## Step 6: User Setup

### First-Time Setup for Users

1. Open Capacinator
2. Navigate to `Settings > Git Sync`
3. Enter:
   - Repository URL: `https://github.enterprise.com/yourorg/capacinator-data.git`
   - Personal Access Token: (paste your PAT)
4. Click "Connect"
5. Wait for initial clone to complete

### Verifying Connection

After setup, users should see:
- Sync status indicator in the header (green checkmark = synced)
- Pull/Push buttons enabled
- Recent commit history in Settings > Git Sync > History

## Repository Structure

```
capacinator-data/
├── scenarios/
│   ├── working/           # Current working data
│   │   ├── projects.json
│   │   ├── people.json
│   │   ├── assignments.json
│   │   └── project_phases.json
│   └── committed/         # Last committed baseline
│       └── [same files]
├── master-data/           # Reference data (roles, locations, etc.)
│   ├── roles.json
│   ├── locations.json
│   └── project_types.json
└── audit/                 # Historical change log
    └── changes.jsonl
```

## User Permissions

Configure repository access in GitHub Enterprise:

| Role | Permission | Use Case |
|------|------------|----------|
| Admin | Admin | Can manage repository settings |
| Manager | Write | Can push changes |
| Viewer | Read | Can pull but not push |

## Conflict Resolution

When multiple users modify the same data:

1. **Automatic Resolution**: Non-conflicting changes are merged automatically
2. **Manual Resolution**: Conflicting changes show a resolution UI
   - View both versions (local vs. remote)
   - Choose: Keep Local, Accept Remote, or Custom Merge
   - Resolve field by field for granular control

### Common Conflict Scenarios

- **Same person assignment**: Two users assign the same person to different projects
- **Date range overlap**: Conflicting project phase dates
- **Allocation exceeds 100%**: Over-allocation detected during sync

## Troubleshooting

### "Network unreachable" Error

1. Check network connectivity to GitHub Enterprise
2. Verify firewall allows HTTPS to GitHub Enterprise server
3. Test with: `curl -I https://github.enterprise.com`

### "Authentication failed" Error

1. Verify token has `repo` scope
2. Check token hasn't expired
3. Generate a new token if necessary
4. Update token in Settings > Git Sync > Credentials

### "Disk space insufficient" Error

1. Free up at least 500MB of disk space
2. Or configure a different local repository path
3. Check with: `df -h` (Linux/Mac) or `dir` (Windows)

### "Merge conflict" Stuck

1. Open Settings > Git Sync > Conflicts
2. Resolve each conflict manually
3. If stuck, reset local state:
   - Settings > Git Sync > Advanced > Reset Local Repository
   - This discards local changes and re-clones from remote

## Backup and Recovery

### Automated Backups

Git history serves as a backup. To restore from a previous state:

```bash
# View commit history
git log --oneline

# Restore to a specific commit
git checkout <commit-sha> -- scenarios/working/

# Or create a branch from old state
git checkout -b backup-recovery <commit-sha>
```

### Manual Backup

Export current state:

```bash
npx ts-node scripts/migrate-to-git.ts \
  --database=capacinator-prod.db \
  --output=./backup-$(date +%Y%m%d)
```

## Performance Considerations

### Large Repositories

For repositories with extensive history:

```bash
# Enable shallow clone
ENABLE_SHALLOW_CLONE=true

# Periodic cleanup (run on server)
cd capacinator-data
git gc --aggressive
```

### Network Optimization

- Configure corporate proxy if required
- Consider local Git mirror for large teams
- Use shallow clones to reduce initial download

## Security Considerations

1. **Token Storage**: Tokens are encrypted using electron-store's secure storage
2. **Data Privacy**: Use private repositories for sensitive planning data
3. **Access Control**: Use GitHub Enterprise's permission system
4. **Audit Trail**: All changes tracked in Git history and optional audit log
5. **Network**: All communication uses HTTPS

## Support

For issues:
1. Check this guide's Troubleshooting section
2. Review application logs: `Settings > About > View Logs`
3. Contact your system administrator
4. Report bugs at: https://github.com/anthropics/claude-code/issues
