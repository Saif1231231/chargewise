-- ChargeWise schema. Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  battery_kwh NUMERIC(5,1) NOT NULL CHECK (battery_kwh > 0),
  charger_kw  NUMERIC(4,1) NOT NULL CHECK (charger_kw > 0),
  region      CHAR(1) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_user_idx ON vehicles(user_id);

CREATE TABLE IF NOT EXISTS plans (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id      BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  region          CHAR(1) NOT NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('flexible', 'continuous')),
  current_percent SMALLINT NOT NULL,
  target_percent  SMALLINT NOT NULL,
  kwh             NUMERIC(6,2) NOT NULL,
  cost_pence      NUMERIC(8,1) NOT NULL,
  saving_pence    NUMERIC(8,1) NOT NULL,
  carbon_grams    INTEGER,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_user_created_idx ON plans(user_id, created_at DESC);
