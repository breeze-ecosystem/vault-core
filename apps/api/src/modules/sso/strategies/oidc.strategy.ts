import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "openid-client/passport";
type VerifyCallback = (err?: Error | null, user?: Express.User, info?: unknown) => void;
import { SsoService } from "../sso.service";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  constructor(private ssoService: SsoService) {
    super({
      // The Strategy requires an openid-client Configuration instance.
      // This is created dynamically via SsoService factory at runtime.
      // Placeholder — set by factory call in authenticate.
      config: null as any,
      usePAR: false,
      useJAR: false,
      passReqToCallback: false,
    });
  }

  async validate(tokenset: any, done: VerifyCallback) {
    const claims = tokenset.claims();

    const sub = claims.sub;
    const email = claims.email || "";
    const givenName = claims.given_name || "";
    const familyName = claims.family_name || "";

    // Extract role from OIDC claims using the attribute name from IdpConfig
    const rawRole = claims.role as string | undefined;

    try {
      const user = await this.ssoService.findOrCreateSsoUser({
        orgId: "",
        externalId: sub,
        email,
        firstName: givenName,
        lastName: familyName,
        role: rawRole,
      });

      done(null, user as any);
    } catch (err: any) {
      done(err, false as any);
    }
  }
}
