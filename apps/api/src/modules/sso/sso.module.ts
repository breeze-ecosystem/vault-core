import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";
import { SamlStrategy } from "./strategies/saml.strategy";
import { OidcStrategy } from "./strategies/oidc.strategy";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    PassportModule.register({}),
    JwtModule.register({}),
    forwardRef(() => AuthModule),
  ],
  controllers: [SsoController],
  providers: [SsoService, SamlStrategy, OidcStrategy],
  exports: [SsoService],
})
export class SsoModule {}
