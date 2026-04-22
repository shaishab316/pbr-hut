import { SafeUser } from '@/common/types/safe-user.type';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRepository } from '../user/repositories/user.repository';

interface AuthSocket extends Socket {
  user: SafeUser;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepo: UserRepository,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token);

      const user = await this.userRepo.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      client.user = user;

      this.logger.log(
        `Client connected — socketId: ${client.id}, userId: ${client.user.id}`,
      );

      //? Join a room
      client.join(`user:${client.user.id}`);
    } catch (error) {
      this.logger.warn(
        `Unauthorized connection attempt — socketId: ${client.id}`,
        error instanceof Error ? error.message : String(error),
      );

      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(
      `Client disconnected — socketId: ${client.id}, userId: ${client.user?.id}`,
    );
  }

  emit(rooms: string[], event: string, data: any) {
    rooms.forEach((room) => {
      this.server.to(room).emit(event, data);
      this.logger.debug(
        `Emitted event '${event}' to room '${room}' with data: ${JSON.stringify(data)}`,
      );
    });
  }
}
