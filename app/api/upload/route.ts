import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Max 8 MB
const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Arquivo muito grande (máx 8 MB)' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: mimeType,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 });
  }
}
