import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, CreditCard, ShieldCheck } from 'lucide-react';
import { AdminUsersTable } from './AdminUsersTable';

async function getAdminStats() {
  const [usersCount, empresasCount, assCount] = await Promise.all([
    sql`SELECT COUNT(*) as c FROM usuarios`,
    sql`SELECT COUNT(*) as c FROM empresas`,
    sql`SELECT COUNT(*) as c FROM pay_assinaturas WHERE payassi_estado = 'ativa'`,
  ]);
  return {
    usuarios: Number(usersCount[0]?.c || 0),
    empresas: Number(empresasCount[0]?.c || 0),
    assinaturas: Number(assCount[0]?.c || 0),
  };
}

async function getUsers() {
  return await sql`
    SELECT usuario_id, usuario_nome, usuario_email, usuario_funcao, usuario_ativo
    FROM usuarios
    ORDER BY usuario_id DESC
    LIMIT 100
  `;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const funcao = (session?.user as any)?.funcao;
  if (funcao !== 0 && funcao !== 1) redirect('/dashboard');

  const [stats, users] = await Promise.all([getAdminStats(), getUsers()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-[#0a1175]" />
        <h1 className="text-xl font-bold text-gray-900">Administração</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.usuarios}</p>
                <p className="text-xs text-gray-500">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.empresas}</p>
                <p className="text-xs text-gray-500">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.assinaturas}</p>
                <p className="text-xs text-gray-500">Assinaturas ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminUsersTable users={users as any} />
        </CardContent>
      </Card>
    </div>
  );
}
