-- ============================================================
-- Ghost Protocol Hackathon — PostgreSQL Schema
-- FLINN Software Labs · July 2026
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── ENUMS ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('lone', 'team_4', 'team_10');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE team_type AS ENUM ('team_4', 'team_10');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT         NOT NULL UNIQUE,
    name                TEXT         NOT NULL,
    password_hash       TEXT         NOT NULL,
    role                user_role    NOT NULL,
    payment_status      BOOLEAN      NOT NULL DEFAULT FALSE,
    payment_reference   TEXT         UNIQUE,
    payment_verified_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_payment_reference ON users (payment_reference);

-- ── TEAMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    team_type   team_type   NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

-- ── SUBMISSION ROUNDS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_rounds (
    round_number SMALLINT    PRIMARY KEY,
    opens_at     TIMESTAMPTZ NOT NULL,
    closes_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_round_window CHECK (closes_at > opens_at)
);

INSERT INTO submission_rounds (round_number, opens_at, closes_at) VALUES
  ( 1, '2026-07-01 00:00:00+00', '2026-07-04 00:00:00+00'),
  ( 2, '2026-07-04 00:00:00+00', '2026-07-07 00:00:00+00'),
  ( 3, '2026-07-07 00:00:00+00', '2026-07-10 00:00:00+00'),
  ( 4, '2026-07-10 00:00:00+00', '2026-07-13 00:00:00+00'),
  ( 5, '2026-07-13 00:00:00+00', '2026-07-16 00:00:00+00'),
  ( 6, '2026-07-16 00:00:00+00', '2026-07-19 00:00:00+00'),
  ( 7, '2026-07-19 00:00:00+00', '2026-07-22 00:00:00+00'),
  ( 8, '2026-07-22 00:00:00+00', '2026-07-25 00:00:00+00'),
  ( 9, '2026-07-25 00:00:00+00', '2026-07-28 00:00:00+00'),
  (10, '2026-07-28 00:00:00+00', '2026-07-31 00:00:00+00'),
  (11, '2026-07-31 00:00:00+00', '2026-08-01 00:00:00+00')
ON CONFLICT (round_number) DO NOTHING;

-- ── SUBMISSIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    team_id      UUID         REFERENCES teams(id)           ON DELETE SET NULL,
    round_number SMALLINT     NOT NULL REFERENCES submission_rounds(round_number),
    pdf_link     TEXT,
    github_link  TEXT,
    youtube_link TEXT,
    score        NUMERIC(6,2) CHECK (score >= 0 AND score <= 100),
    scored_by    UUID         REFERENCES users(id),
    scored_at    TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_user_round UNIQUE (user_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_submissions_user  ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team  ON submissions (team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions (round_number);

-- ── LEADERBOARD ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
    entity_id    UUID          PRIMARY KEY,
    entity_type  TEXT          NOT NULL CHECK (entity_type IN ('user','team')),
    total_score  NUMERIC(10,2) NOT NULL DEFAULT 0,
    rank         INTEGER,
    last_updated TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard (rank ASC NULLS LAST);

-- ── FUNCTION: auto-stamp updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── FUNCTION: verify payment (called by webhook) ─────────────
CREATE OR REPLACE FUNCTION fn_verify_payment(p_reference TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users
    SET payment_status      = TRUE,
        payment_verified_at = NOW()
    WHERE payment_reference = p_reference
      AND payment_status    = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown or already-verified reference: %', p_reference;
    END IF;
END;
$$;

-- ── FUNCTION: block unpaid / out-of-window submissions ───────
CREATE OR REPLACE FUNCTION fn_check_submission_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_paid      BOOLEAN;
    v_opens_at  TIMESTAMPTZ;
    v_closes_at TIMESTAMPTZ;
BEGIN
    SELECT payment_status INTO v_paid FROM users WHERE id = NEW.user_id;
    IF NOT v_paid THEN
        RAISE EXCEPTION 'User % has not completed payment.', NEW.user_id;
    END IF;
    SELECT opens_at, closes_at INTO v_opens_at, v_closes_at
      FROM submission_rounds WHERE round_number = NEW.round_number;
    IF NOW() < v_opens_at THEN
        RAISE EXCEPTION 'Round % has not opened yet.', NEW.round_number;
    END IF;
    IF NOW() > v_closes_at THEN
        RAISE EXCEPTION 'Round % submission window has closed.', NEW.round_number;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submission_eligibility ON submissions;
CREATE TRIGGER trg_submission_eligibility
    BEFORE INSERT ON submissions
    FOR EACH ROW EXECUTE FUNCTION fn_check_submission_eligibility();

-- ── FUNCTION: auto-refresh leaderboard on score change ───────
CREATE OR REPLACE FUNCTION fn_refresh_leaderboard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.score IS NOT DISTINCT FROM OLD.score) THEN
        RETURN NEW;
    END IF;

    -- Update solo user score
    INSERT INTO leaderboard (entity_id, entity_type, total_score, last_updated)
    SELECT user_id, 'user', COALESCE(SUM(score), 0), NOW()
    FROM submissions WHERE user_id = NEW.user_id GROUP BY user_id
    ON CONFLICT (entity_id) DO UPDATE
        SET total_score = EXCLUDED.total_score, last_updated = NOW();

    -- Update team score if applicable
    IF NEW.team_id IS NOT NULL THEN
        INSERT INTO leaderboard (entity_id, entity_type, total_score, last_updated)
        SELECT team_id, 'team', COALESCE(SUM(score), 0), NOW()
        FROM submissions WHERE team_id = NEW.team_id GROUP BY team_id
        ON CONFLICT (entity_id) DO UPDATE
            SET total_score = EXCLUDED.total_score, last_updated = NOW();
    END IF;

    -- Recompute all ranks
    UPDATE leaderboard lb SET rank = ranked.new_rank
    FROM (
        SELECT entity_id, RANK() OVER (ORDER BY total_score DESC) AS new_rank
        FROM leaderboard
    ) ranked
    WHERE lb.entity_id = ranked.entity_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_refresh ON submissions;
CREATE TRIGGER trg_leaderboard_refresh
    AFTER INSERT OR UPDATE OF score ON submissions
    FOR EACH ROW EXECUTE FUNCTION fn_refresh_leaderboard();

-- ── FUNCTION: enforce team size cap ──────────────────────────
CREATE OR REPLACE FUNCTION fn_enforce_team_size()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_type    team_type;
    v_max     INT;
    v_current INT;
BEGIN
    SELECT team_type INTO v_type FROM teams WHERE id = NEW.team_id;
    v_max := CASE v_type WHEN 'team_4' THEN 4 WHEN 'team_10' THEN 10 END;
    SELECT COUNT(*) INTO v_current FROM team_members WHERE team_id = NEW.team_id;
    IF v_current >= v_max THEN
        RAISE EXCEPTION 'Team % is full (max % members).', NEW.team_id, v_max;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_size_cap ON team_members;
CREATE TRIGGER trg_team_size_cap
    BEFORE INSERT ON team_members
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_team_size();

-- ── VIEWS ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
    lb.rank,
    lb.entity_type,
    COALESCE(u.name, t.name)  AS display_name,
    COALESCE(u.email, '')     AS email,
    lb.total_score,
    lb.last_updated
FROM leaderboard lb
LEFT JOIN users u ON lb.entity_type = 'user' AND lb.entity_id = u.id
LEFT JOIN teams t ON lb.entity_type = 'team' AND lb.entity_id = t.id
ORDER BY lb.rank ASC;

CREATE OR REPLACE VIEW v_active_round AS
SELECT * FROM submission_rounds
WHERE NOW() BETWEEN opens_at AND closes_at
LIMIT 1;
