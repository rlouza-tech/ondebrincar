import { useEffect, useState } from "react";
import { useClient } from "sanity";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AtracaoRaw {
  bairro?: string;
  categoria?: string;
  preco?: number | null;
}

interface DashboardData {
  total: number;
  porBairro: [string, number][];
  porCategoria: [string, number][];
  gratuitas: number;
  pagas: number;
  semPreco: number;
}

// ── Labels de categoria ────────────────────────────────────────────────────────

const CATEGORIA_LABEL: Record<string, string> = {
  parque: "Parque",
  museu: "Museu",
  praia: "Praia",
  pracinha: "Pracinha",
  "atividade-extra": "Atividade extra",
  evento: "Evento",
  "colonia-de-ferias": "Colônia de férias",
  futebol: "Futebol",
  restaurante: "Restaurante",
  "festa-junina": "Festa junina",
};

// ── Agregação ──────────────────────────────────────────────────────────────────

function agregar(items: AtracaoRaw[]): DashboardData {
  const bairroMap: Record<string, number> = {};
  const categoriaMap: Record<string, number> = {};
  let gratuitas = 0;
  let pagas = 0;
  let semPreco = 0;

  for (const item of items) {
    const bairro = item.bairro?.trim() || "Sem bairro";
    bairroMap[bairro] = (bairroMap[bairro] ?? 0) + 1;

    const cat = item.categoria ?? "Sem categoria";
    categoriaMap[cat] = (categoriaMap[cat] ?? 0) + 1;

    if (item.preco === 0) gratuitas++;
    else if (typeof item.preco === "number" && item.preco > 0) pagas++;
    else semPreco++;
  }

  return {
    total: items.length,
    porBairro: Object.entries(bairroMap).sort((a, b) => b[1] - a[1]),
    porCategoria: Object.entries(categoriaMap).sort((a, b) => b[1] - a[1]),
    gratuitas,
    pagas,
    semPreco,
  };
}

// ── Estilos inline ─────────────────────────────────────────────────────────────

const S = {
  page: {
    padding: "32px 40px",
    maxWidth: 900,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    color: "#1f2937",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    flexWrap: "wrap" as const,
    gap: 12,
  } as React.CSSProperties,

  h1: { fontSize: 22, fontWeight: 700, margin: 0 } as React.CSSProperties,
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4 } as React.CSSProperties,

  btnRefresh: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 28,
  } as React.CSSProperties,

  card: (borderColor: string): React.CSSProperties => ({
    background: "white",
    border: "1px solid #e5e7eb",
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: 10,
    padding: 20,
  }),

  cardLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#6b7280",
    marginBottom: 6,
  } as React.CSSProperties,

  cardValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 } as React.CSSProperties,
  cardSub: { fontSize: 12, color: "#9ca3af", marginTop: 6 } as React.CSSProperties,

  tablesRow: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  section: {
    flex: 1,
    minWidth: 260,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#6b7280",
    fontWeight: 600,
    marginBottom: 16,
  } as React.CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  } as React.CSSProperties,

  rowLabel: {
    minWidth: 130,
    maxWidth: 150,
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    background: "#f3f4f6",
    overflow: "hidden",
  } as React.CSSProperties,

  barFill: (pct: number, color: string): React.CSSProperties => ({
    width: `${pct}%`,
    height: "100%",
    background: color,
    borderRadius: 4,
    transition: "width .3s",
  }),

  rowCount: {
    minWidth: 28,
    textAlign: "right" as const,
    fontSize: 13,
    fontWeight: 700,
  } as React.CSSProperties,

  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    flexDirection: "column" as const,
    gap: 12,
    color: "#6b7280",
  } as React.CSSProperties,

  errorCard: {
    background: "#fee2e2",
    border: "1px solid #dc2626",
    color: "#dc2626",
    borderRadius: 8,
    padding: "12px 16px",
    margin: 32,
  } as React.CSSProperties,
};

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div style={S.barTrack}>
      <div style={S.barFill(pct, cor)} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  cor,
}: {
  label: string;
  value: number;
  sub?: string;
  cor: string;
}) {
  return (
    <div style={S.card(cor)}>
      <div style={S.cardLabel}>{label}</div>
      <div style={S.cardValue}>{value}</div>
      {sub && <div style={S.cardSub}>{sub}</div>}
    </div>
  );
}

function TabelaContagem({
  titulo,
  linhas,
  labelFn,
  cor,
}: {
  titulo: string;
  linhas: [string, number][];
  labelFn?: (key: string) => string;
  cor: string;
}) {
  const max = linhas[0]?.[1] ?? 1;
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>{titulo}</div>
      {linhas.map(([key, count]) => (
        <div key={key} style={S.row}>
          <div style={S.rowLabel} title={labelFn ? labelFn(key) : key}>
            {labelFn ? labelFn(key) : key}
          </div>
          <Barra valor={count} max={max} cor={cor} />
          <div style={S.rowCount}>{count}</div>
        </div>
      ))}
    </div>
  );
}

// ── Query GROQ ─────────────────────────────────────────────────────────────────

const QUERY = `*[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"] {
  bairro,
  categoria,
  preco
}`;

// ── Componente principal ───────────────────────────────────────────────────────

export function CatalogoDashboard() {
  const client = useClient({ apiVersion: "2024-05-15" });
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string>("");

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const items = await client.fetch<AtracaoRaw[]>(QUERY);
      setDados(agregar(items));
      setAtualizadoEm(new Date().toLocaleTimeString("pt-BR"));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={S.center}>
        <div>Carregando catálogo…</div>
      </div>
    );
  }

  if (erro) {
    return <div style={S.errorCard}>Erro: {erro}</div>;
  }

  if (!dados) return null;

  const pctGratuitas =
    dados.total > 0 ? Math.round((dados.gratuitas / dados.total) * 100) : 0;
  const pctPagas =
    dados.total > 0 ? Math.round((dados.pagas / dados.total) * 100) : 0;

  return (
    <div style={S.page}>
      {/* Cabeçalho */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Dashboard Editorial</h1>
          <p style={S.sub}>
            Atrações <em>operando</em> · atualizado às {atualizadoEm}
          </p>
        </div>
        <button style={S.btnRefresh} onClick={() => void carregar()}>
          ↺ Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={S.cardsGrid}>
        <MetricCard
          label="Total no catálogo"
          value={dados.total}
          sub="status = operando"
          cor="#2563eb"
        />
        <MetricCard
          label="Gratuitas"
          value={dados.gratuitas}
          sub={`${pctGratuitas}% do catálogo`}
          cor="#16a34a"
        />
        <MetricCard
          label="Pagas"
          value={dados.pagas}
          sub={`${pctPagas}% do catálogo`}
          cor="#ea580c"
        />
        <MetricCard
          label="Sem info de preço"
          value={dados.semPreco}
          sub="preencher no Studio"
          cor="#9ca3af"
        />
      </div>

      {/* Tabelas por bairro e categoria */}
      <div style={S.tablesRow}>
        <TabelaContagem
          titulo="Por bairro"
          linhas={dados.porBairro}
          cor="#2563eb"
        />
        <TabelaContagem
          titulo="Por categoria"
          linhas={dados.porCategoria}
          labelFn={(k) => CATEGORIA_LABEL[k] ?? k}
          cor="#7c3aed"
        />
      </div>
    </div>
  );
}
