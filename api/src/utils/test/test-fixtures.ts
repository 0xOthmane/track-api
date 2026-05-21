import { TestingModule } from '@nestjs/testing';
// import { type UserSession } from '@thallesp/nestjs-better-auth';

// import { UsersService } from '../users/users.service';

export function buildFixtures(module: TestingModule) {
  //   const usersService = module.get(UsersService);
  //   type CreatedUser = Awaited<ReturnType<typeof usersService.create>>;
  //   return {
  //     user(override?: { email?: string; name?: string; password?: string }) {
  //       return usersService.create({
  //         email: override?.email ?? 'alice@test.com',
  //         name: override?.name ?? 'Alice Smith',
  //       });
  //     },
  //     session(user: CreatedUser): UserSession {
  //       const now = new Date();
  //       return {
  //         user: {
  //           id: user.id,
  //           email: user.email,
  //           name: user.name,
  //         },
  //         session: {
  //           id: 'session-id',
  //           userId: user.id,
  //           token: 'session-token',
  //           expiresAt: now,
  //         },
  //       } as UserSession;
  //     },
  //   };
}
