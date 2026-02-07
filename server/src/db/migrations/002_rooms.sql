CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id),
  status room_status NOT NULL DEFAULT 'waiting',
  min_bet INTEGER NOT NULL DEFAULT 5,
  max_players INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  spot_index INTEGER NOT NULL CHECK (spot_index >= 0 AND spot_index <= 6),
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id),
  UNIQUE (room_id, spot_index)
);

CREATE INDEX IF NOT EXISTS idx_rooms_waiting ON rooms(status) WHERE status = 'waiting';
