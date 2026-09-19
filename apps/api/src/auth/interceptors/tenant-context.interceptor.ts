import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tenantContext } from "../../common/tenant-context";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Nastaví per-request tenant context (F24) z přihlášeného uživatele (pokud
 * je) — běží globálně, takže veřejné/neautentizované requesty prostě
 * dostanou `null` (bez omezení), přesně jako dnešní chování.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const organizaceId = user?.organizaceId ?? null;

    return new Observable((subscriber) => {
      tenantContext.run(organizaceId, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
