import type { Response } from 'express'

export interface SSEClient {
  res: Response
  userId: string
  username: string
}

class SSEManager {
  private roomClients = new Map<string, Set<SSEClient>>()
  private lobbyClients = new Set<SSEClient>()

  // Room-scoped SSE
  addRoomClient(roomId: string, client: SSEClient) {
    if (!this.roomClients.has(roomId)) {
      this.roomClients.set(roomId, new Set())
    }
    this.roomClients.get(roomId)!.add(client)
  }

  removeRoomClient(roomId: string, client: SSEClient) {
    const clients = this.roomClients.get(roomId)
    if (clients) {
      clients.delete(client)
      if (clients.size === 0) {
        this.roomClients.delete(roomId)
      }
    }
  }

  broadcastToRoom(roomId: string, event: string, data: unknown) {
    const clients = this.roomClients.get(roomId)
    if (!clients) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of clients) {
      client.res.write(payload)
    }
  }

  sendToPlayer(roomId: string, userId: string, event: string, data: unknown) {
    const clients = this.roomClients.get(roomId)
    if (!clients) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of clients) {
      if (client.userId === userId) {
        client.res.write(payload)
      }
    }
  }

  getRoomClientCount(roomId: string): number {
    return this.roomClients.get(roomId)?.size ?? 0
  }

  isPlayerConnected(roomId: string, userId: string): boolean {
    const clients = this.roomClients.get(roomId)
    if (!clients) return false
    for (const client of clients) {
      if (client.userId === userId) return true
    }
    return false
  }

  // Lobby-scoped SSE
  addLobbyClient(client: SSEClient) {
    this.lobbyClients.add(client)
  }

  removeLobbyClient(client: SSEClient) {
    this.lobbyClients.delete(client)
  }

  broadcastToLobby(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of this.lobbyClients) {
      client.res.write(payload)
    }
  }

  // Cleanup for a room
  cleanupRoom(roomId: string) {
    const clients = this.roomClients.get(roomId)
    if (clients) {
      for (const client of clients) {
        client.res.end()
      }
      this.roomClients.delete(roomId)
    }
  }
}

export const sseManager = new SSEManager()
