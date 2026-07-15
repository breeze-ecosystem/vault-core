---
phase: 04-commercial-foundation
plan: 04b
type: execute
wave: 4
depends_on:
  - 04-04a
  - 04-03b
files_modified:
  - apps/api/src/modules/organization/invite/invite.module.ts
  - apps/api/src/modules/organization/invite/invite.controller.ts
  - apps/api/src/modules/organization/invite/invite.service.ts
  - apps/api/src/modules/auth/auth.controller.ts
  - apps/api/src/modules/auth/auth.service.ts
autonomous: true
requirements:
  - FND-05
user_setup:
  - service: Resend
    why: "Invite email delivery (D-12). Already integrated in NotificationsService; JWT_INVITE_SECRET and RESEND_API_KEY must be set."
    env_vars:
      - name: JWT_INVITE_SECRET
        source: "Set in .env (added to .env.example by Plan 02). Generate: openssl rand -hex 32"
      - name: RESEND_API_KEY
        source: "Resend Dashboard -> API Keys. Already exists in .env.example; verify it's set."
    dashboard_config: []

must_haves:
  truths:
    - "POST /api/auth/accept-invite creates User (if new) + OrganizationMember + marks invite ACCEPTED"
    - "Invite CRUD at /api/organizations/:orgId/invites — create (with role, 48h JWT, Resend email), list, resend, revoke"
    - "Invite tokens are JWT-signed with JWT_INVITE_SECRET (separate from access token secret)"
    - "Single-use enforcement: accept checks Invite.status !== 'ACCEPTED'"
    - "Existing users auto-added to org (D-13) — no password required on accept"
  artifacts:
    - path: "apps/api/src/modules/organization/invite/invite.service.ts"
      provides: "Invite creation with JWT + Resend email, accept, resend, revoke, list"
      contains: "createInvite"
      contains: "acceptInvite"
    - path: "apps/api/src/modules/organization/invite/invite.controller.ts"
      provides: "Invite REST endpoints at organizations/:orgId/invites"
      contains: "invites"
    - path: "apps/api/src/modules/auth/auth.controller.ts"
      provides: "accept-invite endpoint (updated)"
      contains: "accept-invite"
    - path: "apps/api/src/modules/auth/auth.service.ts"
      provides: "acceptInvite() method (updated)"
      contains: "acceptInvite"
  key_links:
    - from: "invite.service.ts"
      to: "POST /api/auth/accept-invite"
      via: "JWT verify + OrganizationMember create"
      pattern: "jwt\\.verify.*acceptInvite"
    - from: "invite.service.ts createInvite()"
      to: "Resend API"
      via: "resend.emails.send"
      pattern: "resend\\.emails\\.send"
---

<objective>
Build the InviteModule for email-based organization onboarding: JWT-signed invite tokens with 48h expiry, Resend email delivery, accept-invite flow that creates/finds users and adds them as OrganizationMembers, and CRUD endpoints for invite management. Invite accept endpoint lives on AuthController since it's a public endpoint. This is the second half of Plan 04 — auth/organization module was built in Plan 04a. Implements D-12 through D-15.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-commercial-foundation/04-CONTEXT.md (D-12 through D-15 — all invite decisions)
@.planning/phases/04-commercial-foundation/04-RESEARCH.md (Pattern 7: Invite flow lines 699-778)
@.planning/phases/04-commercial-foundation/04-PATTERNS.md (lines 496-668 for invite module)
@apps/api/src/modules/auth/auth.service.ts (updated from Plan 04a — has createTokens with orgId, has getUserOrganizations)
@apps/api/src/modules/auth/auth.controller.ts (updated from Plan 04a — has switch-org, organizations endpoint)
@apps/api/src/modules/notifications/notifications.service.ts (Resend SDK pattern — read lines 1-40)
@packages/shared/src/schemas/invite.schema.ts (new schemas from Plan 02)
@packages/shared/src/schemas/auth.schema.ts (updated schemas from Plan 02 — acceptInviteSchema)

<interfaces>
From existing NotificationsService (lines 1-40) — Resend pattern:
```typescript
private resend: Resend | null = null;
private readonly emailFrom: string;
// In constructor:
this.emailFrom = this.config.get<string>('RESEND_FROM_EMAIL', 'OVERSIGHT AI <onboarding@resend.dev>');
const resendApiKey = this.config.get<string>('RESEND_API_KEY');
if (resendApiKey) { this.resend = new Resend(resendApiKey); }
```

From AuthService (Plan 04a) — createTokens signature:
```typescript
private async createTokens(userId: string, email: string, orgId: string, role: string)
export async function switchOrg(userId: string, targetOrgId: string)
export async function getUserOrganizations(userId: string)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create InviteService — JWT invite tokens, Resend email, accept flow</name>
  <files>apps/api/src/modules/organization/invite/invite.service.ts</files>
  <read_first>apps/api/src/modules/notifications/notifications.service.ts</read_first>
  <read_first>apps/api/src/modules/auth/auth.service.ts</read_first>
  <action>
    Create apps/api/src/modules/organization/invite/invite.service.ts:

    Follow PATTERNS.md lines 630-668. Inject: PrismaService, JwtService, ConfigService, AuthService (for token creation on accept).

    Key methods:

    1. createInvite(orgId, email, role, createdBy):
       - Sign JWT with `{ orgId, email, role, type: "invite" }`, secret JWT_INVITE_SECRET, 48h expiry (D-12)
       - Create Invite row in DB with status "PENDING"
       - Send email via Resend SDK (same pattern as NotificationsService init: `new Resend(apiKey)`)
       - Email body includes invite URL: `${DASHBOARD_URL}/invite/${token}`
       - Return `{ id, expiresAt }`

    2. listInvites(orgId): findMany with status filter, ordered by createdAt desc

    3. resendInvite(orgId, inviteId):
       - Verify invite exists and is PENDING
       - Re-issue new JWT token, update expiresAt, re-send email

    4. revokeInvite(orgId, inviteId):
       - Set status to "REVOKED" (not DELETE — keep audit trail)

    5. acceptInvite(token, password, firstName, lastName):
       - Verify JWT (JWT_INVITE_SECRET)
       - Check Invite record exists, status is PENDING, not expired (D-12 single-use)
       - Find or create User (D-13: existing user auto-added)
       - Create OrganizationMember row with invited role
       - Mark invite ACCEPTED with acceptedAt timestamp and acceptedById
       - Return tokens via AuthService.createTokens()

    Use Resend SDK with same init pattern as NotificationsService: `this.resend = new Resend(resendApiKey)` with null fallback.
  </action>
  <verify>
    <automated>grep -c "JWT_INVITE_SECRET" apps/api/src/modules/organization/invite/invite.service.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - InviteService.createInvite() signs JWT with JWT_INVITE_SECRET, 48h expiry, sends email via Resend
    - InviteService.acceptInvite() verifies JWT, creates/finds user, creates OrganizationMember, marks invite ACCEPTED
    - Single-use enforcement: accept checks Invite.status !== "ACCEPTED"
    - Existing users auto-added to org (D-13) — no password required for existing users on accept
    - Email uses RESEND_FROM_EMAIL config, invite URL uses DASHBOARD_URL config
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Create InviteModule and InviteController</name>
  <files>apps/api/src/modules/organization/invite/invite.module.ts, apps/api/src/modules/organization/invite/invite.controller.ts</files>
  <read_first>apps/api/src/modules/auth/auth.controller.ts</read_first>
  <action>
    A. Create apps/api/src/modules/organization/invite/invite.module.ts:
       - Simple NestJS module: `@Module({ controllers: [InviteController], providers: [InviteService], exports: [InviteService] })`

    B. Create apps/api/src/modules/organization/invite/invite.controller.ts:
       - @Controller('organizations/:orgId/invites') (D-14)
       - POST / — create invite, @Roles('ADMIN'), @UseGuards(JwtAuthGuard)
       - GET / — list invites, @Roles('ADMIN', 'SUPERVISOR'), @UseGuards(JwtAuthGuard)
       - POST /:inviteId/resend — @Roles('ADMIN'), @UseGuards(JwtAuthGuard)
       - DELETE /:inviteId — revoke, @Roles('ADMIN'), @UseGuards(JwtAuthGuard)
       - Use createInviteSchema for body validation on POST
       - Add Swagger decorators following existing controller patterns
  </action>
  <verify>
    <automated>grep -c "invites" apps/api/src/modules/organization/invite/invite.controller.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - InviteController routes at `organizations/:orgId/invites` with create/list/resend/revoke
    - All invite endpoints protected by JwtAuthGuard + @Roles
    - InviteModule exports InviteService for other modules
    - Controller uses ZodValidationPipe with createInviteSchema
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Add accept-invite endpoint to AuthController + acceptInvite to AuthService</name>
  <files>apps/api/src/modules/auth/auth.controller.ts, apps/api/src/modules/auth/auth.service.ts</files>
  <read_first>apps/api/src/modules/auth/auth.controller.ts</read_first>
  <read_first>apps/api/src/modules/auth/auth.service.ts</read_first>
  <read_first>apps/api/src/modules/organization/invite/invite.service.ts</read_first>
  <action>
    A. Update apps/api/src/modules/auth/auth.service.ts:
       1. Inject InviteService in constructor
       2. ADD acceptInvite() method that delegates to InviteService.acceptInvite():
          ```typescript
          async acceptInvite(token: string, password?: string, firstName?: string, lastName?: string) {
            return this.inviteService.acceptInvite(token, password, firstName, lastName);
          }
          ```

    B. Update apps/api/src/modules/auth/auth.controller.ts:
       1. ADD import: `acceptInviteSchema` from `@repo/shared`
       2. ADD accept-invite endpoint (D-12, PATTERNS.md lines 619-626):
          ```typescript
          @Public()
          @Post('accept-invite')
          async acceptInvite(
            @Body(new ZodValidationPipe(acceptInviteSchema)) body: any,
            @Res({ passthrough: true }) res: FastifyReply,
          ) {
            const result = await this.authService.acceptInvite(body.token, body.password, body.firstName, body.lastName);
            res.setCookie('refreshToken', result.refreshToken, {
              httpOnly: true, secure: process.env.NODE_ENV === 'production',
              path: '/api/auth', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax',
            });
            return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user, organization: result.organization };
          }
          ```
       3. The endpoint is @Public() — no auth required since invitees may not have an account yet.
  </action>
  <verify>
    <automated>grep -c "accept-invite" apps/api/src/modules/auth/auth.controller.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - AuthService has acceptInvite() method delegating to InviteService
    - POST /api/auth/accept-invite endpoint exists as @Public()
    - acceptInviteSchema used for body validation
    - Cookie set on successful accept, tokens returned to client
    - Endpoint handles new users (password required) and existing users (password optional)
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Invite token → acceptInvite() | JWT invite token signed with JWT_INVITE_SECRET; token carries orgId, email, role |
| Resend API → InviteService | Outbound email delivery; API key from env |
| accept-invite (public) → AuthService | No authentication required; token verification is the security layer |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-17 | Elevation of Privilege | Invite token forgery | mitigate | Invite tokens signed with JWT_INVITE_SECRET (separate from access/refresh). Only server can create valid invite tokens. Token carries type:"invite" to prevent cross-purpose use. |
| T-04-18 | Repudiation | Invite accept — no audit | mitigate | acceptInvite() marks Invite status=ACCEPTED with acceptedAt timestamp. Accept action is auditable via Invite table. |
| T-04-21 | Repudiation | Invite token replay | mitigate | Token marked ACCEPTED on first use (single-use enforcement). Duplicate accept attempt throws ConflictException. |
</threat_model>

<verification>
1. `grep -c "JWT_INVITE_SECRET" apps/api/src/modules/organization/invite/invite.service.ts` — invite service uses invite secret
2. `grep -c "acceptInvite" apps/api/src/modules/auth/auth.service.ts` — auth service has acceptInvite method
3. `grep -c "accept-invite" apps/api/src/modules/auth/auth.controller.ts` — controller has endpoint
4. `grep -c "invites" apps/api/src/modules/organization/invite/invite.controller.ts` — invite controller at organizations/:orgId/invites
5. `npx tsc --noEmit --project apps/api/tsconfig.json` — compiles clean (workdir=apps/api)
</verification>

<success_criteria>
Invite CRUD works with JWT-signed tokens and Resend email delivery. Invite accept flow creates OrganizationMember row for new and existing users. Invite management endpoints at /api/organizations/:orgId/invites. Public accept-invite endpoint at /api/auth/accept-invite. Single-use enforcement active.
</success_criteria>

<output>
Create `.planning/phases/04-commercial-foundation/04-04b-SUMMARY.md` when done
</output>
