/**
 * Next.js instrumentation — runs once when the server initialises.
 * Applies all pending DDL migrations idempotently (IF NOT EXISTS guards).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const url = process.env.DATABASE_URL;
  if (!url) return;

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);

    await sql`ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS usuario_plano VARCHAR(20) NOT NULL DEFAULT 'free'`;

    await sql`ALTER TABLE licitacoes_pncp_cache
      ADD COLUMN IF NOT EXISTS catmat_codes TEXT[]`;

    await sql`CREATE INDEX IF NOT EXISTS idx_licitacoes_catmat
      ON licitacoes_pncp_cache USING GIN (catmat_codes)
      WHERE catmat_codes IS NOT NULL`;

    await sql`ALTER TABLE licitacoes_oportunidades
      ADD COLUMN IF NOT EXISTS catmat_codes TEXT[]`;

    await sql`ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS usuario_whatsapp VARCHAR(20)`;

    await sql`ALTER TABLE licitacoes_oportunidades
      ADD COLUMN IF NOT EXISTS ultimo_alerta_em TIMESTAMP`;

    await sql`CREATE TABLE IF NOT EXISTS lances (
      lance_id       SERIAL PRIMARY KEY,
      lance_licitacao VARCHAR(100) NOT NULL,
      lance_conta    INTEGER NOT NULL,
      lance_empresa  INTEGER,
      lance_objeto   TEXT,
      lance_orgao    TEXT,
      lance_valor    NUMERIC(15,2) NOT NULL,
      lance_observacao TEXT,
      lance_resultado VARCHAR(30) NOT NULL DEFAULT 'aguardando',
      lance_data     TIMESTAMP NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_lances_conta
      ON lances (lance_conta)`;

  } catch {
    // Migrations are best-effort; a failure here must not block startup.
  }
}
