# Plan 10-02 SUMMARY: Single Sign-On (SAMl 2.0 + OIDC)

## Objective
Implement SAML 2.0 and OIDC single sign-on authentication using Passport strategies with JIT provisioning.

## Tasks Completed
- **Task 1**: SSO module — IdpConfig CRUD, SAML strategy (certificate, metadataUrl, entryPoint), OIDC strategy (clientId, clientSecret, issuerUrl), Passport integration
- **Task 2**: Auth integration — `exchangeSsoUser` method in AuthService for JWT token exchange after SSO assertion validation; SSO routes gated behind `sso` feature flag (ENTERPRISE tier); JIT account provisioning with IdP attribute mapping

## Artifacts Created
- `apps/api/src/modules/sso/sso.module.ts` — SSO feature module
- `apps/api/src/modules/sso/sso.controller.ts` — SSO configuration CRUD and login/callback routes
- `apps/api/src/modules/sso/sso.service.ts` — IdP config management, assertion validation, JIT provisioning
- `apps/api/src/modules/sso/strategies/saml.strategy.ts` — SAML 2.0 Passport strategy
- `apps/api/src/modules/sso/strategies/oidc.strategy.ts` — OIDC Passport strategy
- `apps/api/src/modules/sso/dto/idp-config.dto.ts` — DTOs for IdP configuration
- `apps/api/src/modules/auth/auth.service.ts` — exchangeSsoUser method added

## Dependencies Added
- `@node-saml/node-saml` — SAML 2.0 assertion handling
- `openid-client` — OIDC client authentication
