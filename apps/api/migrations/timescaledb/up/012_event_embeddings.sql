-- AI-01, AI-03: Event embeddings for semantic search
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;
-- Requires: psql -c "CREATE EXTENSION IF NOT EXISTS vector;" before running this migration
-- Run before: psql -f 012_event_embeddings.sql

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE event_embeddings (
    id         UUID DEFAULT gen_random_uuid(),
    time       TIMESTAMPTZ NOT NULL,
    site_id    UUID NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    event_id   UUID NOT NULL,
    summary    TEXT NOT NULL,
    embedding  VECTOR(768) NOT NULL  -- Ollama nomic-embed-text dimension
);

SELECT create_hypertable('event_embeddings', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

CREATE INDEX idx_event_embeddings_site ON event_embeddings (site_id, time DESC);
CREATE INDEX idx_event_embeddings_vector ON event_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
