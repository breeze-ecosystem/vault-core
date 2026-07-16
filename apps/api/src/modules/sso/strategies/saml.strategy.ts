import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifiedCallback } from "passport-saml";
import { SsoService } from "../sso.service";

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, "saml") {
  constructor(private ssoService: SsoService) {
    super({
      // Placeholder config — actual values loaded dynamically per-org
      // via SsoService.createSamlStrategy factory pattern
      callbackUrl: "",
      entryPoint: "",
      issuer: "",
      cert: "",
      acceptedClockSkewMs: 60000, // 60s tolerance for clock drift (Pitfall 1)
      signatureAlgorithm: "sha256" as const,
      wantAssertionsSigned: false,
      passReqToCallback: true,
    } as any);
  }

  async validate(req: any, profile: Profile, done: VerifiedCallback) {
    const orgId = req.orgId || req.user?.orgId;

    if (!orgId) {
      return done(new UnauthorizedException("Organization context required for SSO"), false as any);
    }

    const nameID = profile.nameID;
    const email: string =
      (profile.email as string) || (profile["urn:oid:0.9.2342.19200300.100.1.3"] as string) || "";
    const firstName: string =
      (profile["urn:oid:2.5.4.42"] as string) || (profile.firstName as string) || "";
    const lastName: string =
      (profile["urn:oid:2.5.4.4"] as string) || (profile.lastName as string) || "";

    // Extract role from SAML attributes using the attribute name from IdpConfig
    // Default attribute name is "role" — resolved against ROLE_HIERARCHY
    const rawRole = profile["role"] as string | undefined;

    try {
      const user = await this.ssoService.findOrCreateSsoUser({
        orgId,
        externalId: nameID || email,
        email,
        firstName,
        lastName,
        role: rawRole,
      });

      done(null, user as any);
    } catch (err: any) {
      done(err, false as any);
    }
  }
}
