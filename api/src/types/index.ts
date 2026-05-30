import { DynamicModule, ForwardReference } from "@nestjs/common";
import { Type } from "@nestjs/common/interfaces/type.interface";

export type AuthUser = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  role?: string;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
};

export type AuthSession = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
};

export interface UserRequest extends Request {
  user: AuthUser;
  session?: AuthSession;
}

export type ModuleImport =
  | Type<any>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference<any>;