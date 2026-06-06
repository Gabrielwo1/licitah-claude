'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';

const ALL_MODS = [
  { mod: 8,  label: 'Dispensa de Licitação' },
  { mod: 6,  label: 'Pregão Eletrônico' },
  { mod: 9,  label: 'Inexigibilidade' },
  { mod: 7,  label: 'Pregão Presencial' },
  { mod: 4,  label: 'Concorrência Eletrônica' },
  { mod: 5,  label: 'Concorrência Presencial' },
  { mod: 12, label: 'Credenciamento' },
  { mod: 1,  label: 'Leilão Eletrônico' },
  { mod: 13, label: 'Leilão Presencial' },
  { mod: 14, label: 'Diálogo Competitivo' },
  { mod: 15, label: 'Concurso' },
  { mod: 10, label: 'mod 10' },
  { mod: 11, label: 'mod 11' },
  { mod: 3,  label: 'Pré-qualificação' },
  { mod: 2,  label: 'Manifestação de Interesse' },
];

interface CacheStats {
  total: number;
  byModalidade: { modalidade_id: number; modalidade_nome: string; c: number; ultima_sync: string }[];
  lastSync: string | null;
  oldestRecord: string | null;
}

type ModStatus = 'idle' | 'running' | 'done' | 'error';

interface ModResult {
  status: ModStatus;
  inserted?: number;
  updated?: number;
  pagesFetched?: number;
  totalRecords?: number;
  hitDeadline?: boolean;
  error?: string;
}

export function SyncPanel() {
  const [stats, setStats]         = useState<CacheStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [modResults, setModResults] = useState<Record<number, ModResult>>({});
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [syncAllCancelled, setSyncAllCancelled] = useState(false);
  const cancelRef = { current: false };

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/cache-stats');
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  function countForMod(mod: number) {
    return stats?.byModalidade.find(b => b.modalidade_id === mod)?.c ?? 0;
  }

  async function syncOne(mod: number): Promise<boolean> {
    setModResults(prev => ({ ...prev, [mod]: { status: 'running' } }));
    try {
      const res = await fetch('/api/admin/sync-pncp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mod, days: 90, concurrency: 6 }),
      });

      // Vercel pode retornar HTML/texto quando a função ultrapassa 60s
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        setModResults(prev => ({
          ...prev,
          [mod]: {
            status: 'error',
            error: 'Timeout (>60s) — clique Sync novamente para continuar de onde parou',
          },
        }));
        return false;
      }

      if (!res.ok || json.error) {
        setModResults(prev => ({ ...prev, [mod]: { status: 'error', error: json.error || 'Erro desconhecido' } }));
        return false;
      }
      setModResults(prev => ({
        ...prev,
        [mod]: {
          status:       'done',
          inserted:     json.inserted,
          updated:      json.updated,
          pagesFetched: json.pagesFetched,
          totalRecords: json.totalRecords,
          hitDeadline:  json.hitDeadline,
        },
      }));
      return true;
    } catch (e: any) {
      setModResults(prev => ({ ...prev, [mod]: { status: 'error', error: String(e?.message || e) } }));
      return false;
    }
  }

  async function syncAll() {
    setSyncAllRunning(true);
    setSyncAllCancelled(false);
    cancelRef.current = false;
    setModResults({});

    for (const { mod } of ALL_MODS) {
      if (cancelRef.current) break;
      await syncOne(mod);
    }

    setSyncAllRunning(false);
    await fetchStats();
  }

  function cancelSyncAll() {
    cancelRef.current = true;
    setSyncAllCancelled(true);
    setSyncAllRunning(false);
  }

  function fmt(n?: number) {
    return (n ?? 0).toLocaleString('pt-BR');
  }

  function fmtDate(s: string | null) {
    if (!s) return '—';
    return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ border: '1px solid #E5E5E5', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E5E5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database className="h-5 w-5" style={{ color: '#0a1175' }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#262E3A' }}>Cache PNCP</p>
            {loadingStats ? (
              <p style={{ fontSize: '12px', color: '#7B7B7B' }}>Carregando...</p>
            ) : (
              <p style={{ fontSize: '12px', color: '#7B7B7B' }}>
                <strong style={{ color: '#262E3A' }}>{fmt(stats?.total)}</strong> licitações no banco
                {stats?.lastSync && ` · Última sync: ${fmtDate(stats.lastSync)}`}
                {stats?.oldestRecord && ` · Mais antiga: ${stats.oldestRecord}`}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchStats}
            disabled={loadingStats}
            style={{
              height: '34px', padding: '0 14px', borderRadius: '7px',
              border: '1px solid #D3D3D3', backgroundColor: '#fff',
              color: '#262E3A', fontSize: '12px', fontWeight: 600,
              cursor: loadingStats ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            Atualizar stats
          </button>
          {syncAllRunning ? (
            <button
              onClick={cancelSyncAll}
              style={{
                height: '34px', padding: '0 14px', borderRadius: '7px',
                border: 'none', backgroundColor: '#FF4500',
                color: '#fff', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={syncAll}
              style={{
                height: '34px', padding: '0 16px', borderRadius: '7px',
                border: 'none', backgroundColor: '#0a1175',
                color: '#fff', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar Tudo (90 dias)
            </button>
          )}
        </div>
      </div>

      {syncAllCancelled && (
        <div style={{ padding: '10px 20px', backgroundColor: '#FFF8E1', borderBottom: '1px solid #FFE082', fontSize: '13px', color: '#7B5800' }}>
          Sincronização cancelada. Clique em "Sincronizar Tudo" para reiniciar.
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5E5', backgroundColor: '#F8F8F8' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B', width: '40%' }}>Modalidade</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B' }}>No banco</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B' }}>Inseridos</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B' }}>Atualizados</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B' }}>Páginas</th>
              <th style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 600, color: '#7B7B7B' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODS.map(({ mod, label }, i) => {
              const r = modResults[mod];
              const cached = countForMod(mod);
              const isRunning = r?.status === 'running';
              const isDone    = r?.status === 'done';
              const isError   = r?.status === 'error';

              return (
                <tr
                  key={mod}
                  style={{
                    borderBottom: i < ALL_MODS.length - 1 ? '1px solid #F0F0F0' : 'none',
                    backgroundColor: isDone ? '#F0FFF4' : isError ? '#FFF5F5' : isRunning ? '#F0F4FF' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: '#262E3A', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />}
                      {isDone    && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {isError   && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <span>{label}</span>
                    </div>
                    {isError && (
                      <p style={{ fontSize: '11px', color: '#FF4500', marginTop: '2px', paddingLeft: '22px' }}>{r.error}</p>
                    )}
                    {isDone && r.hitDeadline && (
                      <p style={{ fontSize: '11px', color: '#FF8C00', marginTop: '2px', paddingLeft: '22px' }}>
                        ⚡ Limite de 60s atingido — clique Sync novamente para buscar as próximas páginas
                      </p>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#262E3A', fontWeight: 600 }}>
                    {fmt(cached)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: isDone ? '#259F46' : '#7B7B7B' }}>
                    {isDone ? `+${fmt(r.inserted)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: isDone ? '#0a1175' : '#7B7B7B' }}>
                    {isDone ? fmt(r.updated) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#7B7B7B' }}>
                    {isDone ? `${fmt(r.pagesFetched)} / ${fmt(r.totalRecords ? Math.ceil(r.totalRecords / 50) : 0)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => syncOne(mod)}
                      disabled={isRunning || syncAllRunning}
                      style={{
                        height: '28px', padding: '0 12px', borderRadius: '6px',
                        border: '1px solid #D3D3D3',
                        backgroundColor: isRunning ? '#E0E0E0' : '#fff',
                        color: '#262E3A', fontSize: '12px', fontWeight: 600,
                        cursor: (isRunning || syncAllRunning) ? 'not-allowed' : 'pointer',
                        opacity: syncAllRunning && !isRunning ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isRunning ? 'Sincronizando...' : 'Sync'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer total */}
          <tfoot>
            <tr style={{ borderTop: '2px solid #E5E5E5', backgroundColor: '#F8F8F8' }}>
              <td style={{ padding: '10px 16px', fontWeight: 700, color: '#262E3A' }}>Total</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#262E3A' }}>
                {fmt(stats?.total)}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#259F46' }}>
                {Object.values(modResults).some(r => r.inserted !== undefined)
                  ? `+${fmt(Object.values(modResults).reduce((s, r) => s + (r.inserted ?? 0), 0))}`
                  : '—'}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
