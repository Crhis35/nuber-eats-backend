import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/users/users.service';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if ('bearer' in req.headers) {
      const token = req.headers['bearer'];

      try {
        const decoded = this.jwtService.verify(token.toString());
        if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
          const { user, ok } = await this.userService.findById(decoded['id']);

          if (ok) {
            req['user'] = user;
          }
        }
      } catch (error) {}
    }
    next();
  }
}

// export function JwtMiddleware(req: Request, res: Response, next: NextFunction) {
//   const authorization = req.headers;
//   console.log(authorization);
//   next();
// }
