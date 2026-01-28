# Feature Specification: GitHub Authentication and User Association

**Feature Branch**: `005-github-auth-user-link`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "please create our specification for github authentication and user association. we want to be thoughtful about allowing multiple methods for github auth: un/pw, OAuth, Keys. we also want to be thoughtful about association of \"people resources\" with actual users"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect GitHub Account via OAuth (Priority: P1)

A project manager wants to link their GitHub account to their Capacinator user profile to enable Git sync features without sharing credentials. They prefer the secure OAuth flow where GitHub handles authentication.

**Why this priority**: OAuth is the industry-standard secure method for third-party integrations. It provides the best user experience (no password sharing) and the strongest security model (token-based with scopes). This is the foundation that most users will rely on.

**Independent Test**: Can be fully tested by having a user click "Connect GitHub" in their profile, complete GitHub's OAuth flow, and verify their account appears as connected. Delivers immediate value by enabling Git sync features without additional authentication steps.

**Acceptance Scenarios**:

1. **Given** a logged-in Capacinator user with no GitHub connection, **When** they click "Connect GitHub Account" and authorize the application on GitHub, **Then** their GitHub account is linked to their Capacinator profile and they can access Git sync features
2. **Given** a user in the middle of OAuth flow, **When** they cancel authorization on GitHub, **Then** they are returned to Capacinator with a clear message that connection was not completed
3. **Given** a user with an existing GitHub connection, **When** they attempt to connect again, **Then** they see their current connection status and option to disconnect or re-authorize

---

### User Story 2 - Connect GitHub via Personal Access Token (Priority: P2)

A technical user working in an environment where OAuth redirects are problematic (CI/CD, automated scripts, restricted networks) wants to use a GitHub Personal Access Token (PAT) to authenticate.

**Why this priority**: PATs are essential for automation, headless environments, and users who prefer direct credential management. While OAuth is preferred for interactive use, PATs enable critical workflows that OAuth cannot support (server-to-server, automation, restricted environments).

**Independent Test**: Can be fully tested by having a user paste a valid GitHub PAT into the connection settings, verifying token scopes, and confirming Git sync works. Delivers value for automated and technical workflows independently of OAuth.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they provide a valid GitHub Personal Access Token with required scopes, **Then** their GitHub account is connected and Git sync features are enabled
2. **Given** a user providing a PAT, **When** the token lacks required scopes (repo access), **Then** they see a clear error message listing the missing scopes needed
3. **Given** a user with a connected PAT, **When** the token is revoked on GitHub, **Then** they see an error on next sync attempt with instructions to update their credentials
4. **Given** a user, **When** they enter a PAT, **Then** the token is validated immediately and they see confirmation of which GitHub user it belongs to before saving

---

### User Story 3 - Associate Multiple People Resources with One GitHub Account (Priority: P2)

A consultant works on multiple projects within Capacinator, appearing as different "people resources" in different project teams. They want to link all these people records to their single GitHub account so their commits are correctly attributed across all projects.

**Why this priority**: This solves a real organizational problem where the same person appears multiple times in the system (different teams, different roles, different projects). Proper attribution of work is critical for accurate capacity planning and prevents the confusion of "which Jane Smith did this work?"

**Independent Test**: Can be fully tested by creating multiple people resources with the same email, connecting a GitHub account, and verifying that commits from that GitHub account are correctly attributed to all matching people resources. Delivers value by consolidating work attribution across organizational boundaries.

**Acceptance Scenarios**:

1. **Given** multiple people resources sharing the same email address, **When** a user connects their GitHub account, **Then** all people resources with that email are automatically associated with the GitHub account
2. **Given** people resources with different email addresses, **When** an admin manually links them to the same GitHub account, **Then** commits from that GitHub account are attributed to all linked people resources
3. **Given** a person resource linked to a GitHub account, **When** viewing their capacity utilization, **Then** their GitHub commit activity is visible and counted toward their workload
4. **Given** multiple people resources linked to one GitHub account, **When** viewing a commit in Git sync history, **Then** it shows which person resource(s) are associated with the committer

---

### User Story 4 - Manage Multiple GitHub Accounts per User (Priority: P3)

A developer maintains both a personal GitHub account and a work GitHub account. They want to connect both accounts to Capacinator and specify which account to use for different projects or repositories.

**Why this priority**: While less common than single-account scenarios, this addresses legitimate use cases (personal/work separation, multiple organizations, client accounts). It's prioritized lower because most users only need one connection, but it's important for flexibility.

**Independent Test**: Can be fully tested by connecting two different GitHub accounts to one Capacinator user, assigning each to different project contexts, and verifying Git sync uses the correct account for each context. Delivers value for users managing work across organizational boundaries.

**Acceptance Scenarios**:

1. **Given** a user with one GitHub account connected, **When** they add a second GitHub account, **Then** both accounts appear in their connection list and they can select which one to use as default
2. **Given** multiple connected GitHub accounts, **When** configuring Git sync for a project, **Then** the user can choose which GitHub account credentials to use for that project
3. **Given** a user with multiple GitHub accounts, **When** they view their profile, **Then** they see all connected accounts with clear labels and last-used timestamps
4. **Given** a user, **When** they attempt to connect a GitHub account already linked to another Capacinator user, **Then** they see an error explaining the account is already in use

---

### Edge Cases

- What happens when a GitHub account is deleted or deactivated? System should detect failed authentication and prompt user to reconnect or remove the connection.
- How does the system handle a user connecting the same GitHub account to multiple Capacinator users? System should prevent this and show an error that the GitHub account is already linked to another user, with instructions to disconnect it first.
- What happens when a PAT expires or is revoked? On next sync attempt, system detects invalid credentials and prompts user to update their token with clear instructions.
- How does the system handle GitHub accounts with no associated email? System should require at least one verified email on the GitHub account to enable connection, or allow manual association by admin.
- What happens when multiple people resources have the same email but shouldn't be linked to the same GitHub account? Admins can manually override automatic associations, breaking the link for specific people resources.
- How does the system handle GitHub Enterprise vs GitHub.com? System should support both, with users specifying the GitHub instance URL when connecting (defaulting to github.com).
- What happens during OAuth flow if the user's Capacinator session expires? The OAuth callback should handle expired sessions gracefully, prompting re-login while preserving the OAuth state to complete the connection.
- How does the system handle rate limiting from GitHub API? System should implement exponential backoff and show clear messages to users when rate limits are hit, with estimated time until retry is possible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support OAuth 2.0 flow for GitHub authentication as the primary connection method
- **FR-002**: System MUST support GitHub Personal Access Token (PAT) authentication as an alternative connection method
- **FR-003**: System MUST validate GitHub PAT permissions and scope requirements before accepting the token
- **FR-004**: System MUST securely store GitHub credentials (OAuth tokens, PATs) using encryption at rest
- **FR-005**: System MUST automatically associate GitHub accounts with people resources based on email address matching
- **FR-006**: System MUST allow administrators to manually associate/disassociate GitHub accounts with people resources
- **FR-007**: System MUST support connecting multiple people resources to a single GitHub account
- **FR-008**: System MUST support connecting multiple GitHub accounts to a single Capacinator user
- **FR-009**: System MUST prevent connecting the same GitHub account to multiple Capacinator users
- **FR-010**: System MUST display connection status (connected, expired, invalid) for each GitHub account
- **FR-011**: System MUST allow users to disconnect GitHub accounts from their profile
- **FR-012**: System MUST provide clear error messages when GitHub authentication fails, including specific reasons and remediation steps
- **FR-013**: System MUST display which GitHub account credentials are being used for each project's Git sync
- **FR-014**: System MUST validate OAuth callback state parameters to prevent CSRF attacks
- **FR-015**: System MUST refresh expired OAuth tokens automatically when possible
- **FR-016**: System MUST support both github.com and GitHub Enterprise instances
- **FR-017**: System MUST respect GitHub API rate limits and implement backoff strategies
- **FR-018**: System MUST log all GitHub authentication events (connections, disconnections, failures) for audit purposes
- **FR-019**: System MUST attribute Git commits to the correct people resource(s) based on GitHub account associations
- **FR-020**: System MUST allow users to specify a default GitHub account when multiple are connected

### Key Entities

- **GitHub Connection**: Represents a link between a Capacinator user and a GitHub account. Attributes include connection method (OAuth/PAT), GitHub username, GitHub user ID, connection status, token expiry, last used timestamp, scopes/permissions.

- **GitHub Account Association**: Represents the mapping between a GitHub Connection and one or more People Resources. Attributes include association type (automatic via email/manual by admin), association date, active status.

- **People Resource**: Existing entity representing a person in the capacity planning system. Will be extended with relationships to GitHub Account Associations for commit attribution.

- **User**: Existing entity representing a Capacinator system user. Will be extended with relationships to GitHub Connections (one-to-many).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully connect a GitHub account via OAuth in under 1 minute with no more than 3 clicks
- **SC-002**: 95% of users who attempt to connect GitHub via OAuth complete the flow successfully on first attempt
- **SC-003**: Users can disconnect and reconnect a different GitHub account in under 30 seconds
- **SC-004**: System correctly attributes 99% of Git commits to the appropriate people resource(s) based on GitHub account associations
- **SC-005**: Zero instances of GitHub credentials being stored in plaintext or accessible without proper authorization
- **SC-006**: System handles GitHub API rate limiting gracefully with no user-visible errors during normal usage patterns (under 1000 API calls per hour per user)
- **SC-007**: Administrators can resolve people resource association conflicts in under 2 minutes using the manual association interface
- **SC-008**: Support tickets related to GitHub authentication issues decrease by 75% compared to current Git sync implementation
- **SC-009**: Users with multiple GitHub accounts can switch between accounts for different projects with zero manual re-authentication required
- **SC-010**: 100% of OAuth flows complete securely with proper state validation and no CSRF vulnerabilities
