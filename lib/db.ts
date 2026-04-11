import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    _sql = neon(url);
  }
  return _sql;
}

// Proxy: any call like sql`...` works transparently
const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    return (getDb() as any)(...args);
  },
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export default sql;
