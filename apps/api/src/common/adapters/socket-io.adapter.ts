import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          "https://oversight.digitsoftafrica.com",
          "https://oversight.app.digitsoftafrica.com",
          "https://oversight-api.digitsoftafrica.com",
          "http://localhost:3100",
          "http://localhost:3000",
          /^http:\/\/100\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
        ],
        credentials: true,
      },
    });
    return server;
  }
}
