import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'node:crypto';

const JWT_SECRET: string =
  process.env.JWT_SECRET || 'child_learning_app_secret_key';

function base64UrlEncode(data: Buffer): string {
  return data
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(str: string): Buffer {
  const padded: string =
    str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

interface JwtPayload {
  familyAccountId: string;
  iat: number;
  exp: number;
}

function verifyToken(token: string): JwtPayload {
  const parts: string[] = token.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedException('无效的 token 格式');
  }

  const [headerB64, payloadB64, signatureB64]: string[] = parts;
  const signingInput: string = `${headerB64}.${payloadB64}`;

  const expectedSignature: string = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(signingInput).digest(),
  );

  if (signatureB64 !== expectedSignature) {
    throw new UnauthorizedException('token 签名验证失败');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    throw new UnauthorizedException('token  payload 解析失败');
  }

  if (!payload.familyAccountId || typeof payload.familyAccountId !== 'string') {
    throw new UnauthorizedException('token 缺少 familyAccountId');
  }

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new UnauthorizedException('token 已过期');
  }

  return payload;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader: string | undefined = req.headers.authorization;
    const customTokenHeader: string | undefined = req.headers['x-family-token'] as
      | string
      | undefined;

    let token: string = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (customTokenHeader) {
      token = customTokenHeader;
    }

    if (!token) {
      throw new UnauthorizedException('缺少有效认证 token');
    }
    const payload: JwtPayload = verifyToken(token);
    (req as unknown as { familyAccountId: string }).familyAccountId =
      payload.familyAccountId;
    next();
  }
}

export function signToken(familyAccountId: string): string {
  const header: string = base64UrlEncode(
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  );
  const now: number = Math.floor(Date.now() / 1000);
  const payload: string = base64UrlEncode(
    Buffer.from(
      JSON.stringify({
        familyAccountId,
        iat: now,
        exp: now + 30 * 24 * 60 * 60, // 30 天
      }),
    ),
  );
  const signingInput: string = `${header}.${payload}`;
  const signature: string = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(signingInput).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt: Buffer = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 32, (err: Error | null, derivedKey: Buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts: string[] = storedHash.split(':');
    if (parts.length !== 2) {
      reject(new Error('无效的密码哈希格式'));
      return;
    }
    const [saltHex, hashHex]: string[] = parts;
    const salt: Buffer = Buffer.from(saltHex, 'hex');
    const expectedHash: Buffer = Buffer.from(hashHex, 'hex');
    crypto.scrypt(password, salt, 32, (err: Error | null, derivedKey: Buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(
        derivedKey.length === expectedHash.length &&
          crypto.timingSafeEqual(derivedKey, expectedHash),
      );
    });
  });
}
