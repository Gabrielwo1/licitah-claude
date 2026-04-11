import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const userId = (session.user as any).id;

  const empresas = await sql`
    SELECT e.*, ea.ea_funcao
    FROM empresas e
    JOIN empresas_associacao ea ON ea.ea_empresa = e.empresa_id
    WHERE ea.ea_usuario = ${userId}
    ORDER BY e.empresa_nome ASC
  `;

  return NextResponse.json(empresas);
}
