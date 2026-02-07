import { sseManager } from '../sse/manager.js'
import { config } from '../config.js'

interface ActiveTimer {
  interval: ReturnType<typeof setInterval>
  timeout: ReturnType<typeof setTimeout>
  secondsLeft: number
}

const roomTimers = new Map<string, ActiveTimer>()

export function startTurnTimer(roomId: string, onTimeout: () => void) {
  clearTimer(roomId)

  let secondsLeft = config.game.turnTimerSeconds

  // Broadcast initial timer
  sseManager.broadcastToRoom(roomId, 'turn_timer', { secondsLeft })

  const interval = setInterval(() => {
    secondsLeft--
    sseManager.broadcastToRoom(roomId, 'turn_timer', { secondsLeft })

    if (secondsLeft <= 0) {
      clearTimer(roomId)
    }
  }, 1000)

  const timeout = setTimeout(() => {
    clearTimer(roomId)
    onTimeout()
  }, config.game.turnTimerSeconds * 1000)

  roomTimers.set(roomId, { interval, timeout, secondsLeft })
}

export function startBettingTimer(roomId: string, onTimeout: () => void) {
  clearTimer(roomId)

  let secondsLeft = config.game.bettingTimerSeconds

  sseManager.broadcastToRoom(roomId, 'betting_timer', { secondsLeft })

  const interval = setInterval(() => {
    secondsLeft--
    sseManager.broadcastToRoom(roomId, 'betting_timer', { secondsLeft })

    if (secondsLeft <= 0) {
      clearTimer(roomId)
    }
  }, 1000)

  const timeout = setTimeout(() => {
    clearTimer(roomId)
    onTimeout()
  }, config.game.bettingTimerSeconds * 1000)

  roomTimers.set(roomId, { interval, timeout, secondsLeft })
}

export function clearTimer(roomId: string) {
  const timer = roomTimers.get(roomId)
  if (timer) {
    clearInterval(timer.interval)
    clearTimeout(timer.timeout)
    roomTimers.delete(roomId)
  }
}

export function hasTimer(roomId: string): boolean {
  return roomTimers.has(roomId)
}
