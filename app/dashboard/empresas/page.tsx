'use client';

import { useState, useEffect } from 'react';
import { Building2, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empresa } from '@/lib/types';

interface EmpresaWithFuncao extends Empresa {
  ea_funcao: number;
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<EmpresaWithFuncao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then(d => setEmpresas(d))
      .finally(() => setLoading(false));
  }, []);

  const funcaoLabel = (f: number) => {
    if (f === 0) return 'Administrador';
    if (f === 1) return 'Gerente';
    return 'Membro';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-[#0a1175]" />
        <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0a1175]" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma empresa vinculada</p>
          <p className="text-sm mt-1">Você ainda não está associado a nenhuma empresa.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {empresas.map((e) => (
            <Card key={e.empresa_id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{e.empresa_nome}</CardTitle>
                  <Badge variant={e.ea_funcao === 0 ? 'default' : 'secondary'}>
                    {funcaoLabel(e.ea_funcao)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>CNPJ: {e.empresa_cnpj || 'Não informado'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
