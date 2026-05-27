// src/auth/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // handle both REST and GraphQL contexts
    let user;

    if (context.getType() === 'http') {
      user = context.switchToHttp().getRequest().user;
    } else {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext().req.user;
    }

    if (!user) throw new ForbiddenException();
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');

    return true;
  }
}