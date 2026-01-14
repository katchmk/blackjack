import { Analytics } from '@vercel/analytics/react';
import { Game } from './components/Game';
import './App.css';

function App() {
  return (
    <>
      <Analytics />
      <div className="min-h-screen flex flex-col items-center p-5 bg-slate-900 text-white">
        <h1 className="mb-5 text-4xl font-bold text-yellow-400 drop-shadow-lg">Blackjack</h1>
        <Game />
      </div>
    </>
  );
}

export default App;
