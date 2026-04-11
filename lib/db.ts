import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    _sql = neon(url);
  }
  return _sql;
}

// sql`...` — lazy tagged template, returns any[] for easy indexing
const sql = async (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> => {
  const result = await getDb()(strings, ...values);
  return result as any[];
};

export default sql;
