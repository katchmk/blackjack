import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react';
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { AuthGate } from './components/auth/AuthGate'
import { Lobby } from './components/lobby/Lobby'
import { RoomLobby } from './components/room/RoomLobby'
import { MultiplayerGame } from './components/game/MultiplayerGame'
import { Game } from './components/Game'
import './App.css';

function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext.Provider value={auth}>
      <Analytics />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col items-center p-5 bg-slate-900 text-white">
          <h1 className="mb-5 text-4xl font-bold text-yellow-400 drop-shadow-lg">Blackjack</h1>
          <Routes>
            {/* Practice mode — no auth required */}
            <Route path="/practice" element={<Game />} />

            {/* Multiplayer routes — auth required */}
            <Route
              path="/"
              element={
                <AuthGate>
                  <Lobby />
                </AuthGate>
              }
            />
            <Route
              path="/room/:id"
              element={
                <AuthGate>
                  <RoomLobby />
                </AuthGate>
              }
            />
            <Route
              path="/game/:id"
              element={
                <AuthGate>
                  <MultiplayerGame />
                </AuthGate>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App;
