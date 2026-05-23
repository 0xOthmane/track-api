import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { auth } from '../lib/auth';
import { AuthSession, AuthUser } from '../types';

type AttendanceSocketData = {
  user?: AuthUser;
  session?: AuthSession;
};

type AttendanceSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  AttendanceSocketData
>;

export type AttendanceAtRiskNotification = {
  courseId: string;
  sessionId: string;
  studentId: string;
  teacherId?: string | null;
  totalCount: number;
  presentCount: number;
  absentCount: number;
  presenceRate: number;
  absenceRate: number;
  atRisk: boolean;
};

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class AttendanceGateway implements OnGatewayConnection {
  private readonly logger = new Logger(AttendanceGateway.name);

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: AttendanceSocket) {
    const session = await auth.api.getSession({
      headers: this.toHeaders(
        client.handshake.headers as Record<
          string,
          string | string[] | undefined
        >,
      ),
    });

    if (!session) {
      this.logger.warn(`socket ${client.id} disconnected: unauthenticated`);
      client.emit('attendance.unauthorized');
      client.disconnect(true);
      return;
    }

    client.data.user = session.user;
    client.data.session = session.session;
    await client.join(this.userRoom(session.user.id));
  }

  @SubscribeMessage('attendance.subscribe')
  handleSubscribe(@ConnectedSocket() client: AttendanceSocket) {
    const userId = this.getAuthenticatedUserId(client);
    if (!userId) {
      return { joined: false };
    }

    void client.join(this.userRoom(userId));
    return { joined: true, userId };
  }

  emitAtRisk(notification: AttendanceAtRiskNotification) {
    this.server
      .to(this.userRoom(notification.studentId))
      .emit('attendance.atRisk', notification);

    if (notification.teacherId) {
      this.server
        .to(this.userRoom(notification.teacherId))
        .emit('attendance.atRisk', notification);
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private getAuthenticatedUserId(client: AttendanceSocket) {
    const user = client.data.user;
    const session = client.data.session;

    if (!user || !session) {
      return null;
    }

    return user.id ?? session.userId ?? null;
  }

  private toHeaders(source: Record<string, string | string[] | undefined>) {
    const headers = new Headers();

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'undefined') {
        continue;
      }

      headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }

    return headers;
  }
}
