import type { CSSProperties, ReactNode } from "react";
import {
  groupAbstainReasons,
  type AbstainReasonCategory,
} from "@/lib/pipeline/abstain-reasons";

interface AbstainReasonItem {
  _key?: string;
  code?: string;
  category?: AbstainReasonCategory;
}

interface AbstainReasonsInputProps {
  value?: AbstainReasonItem[];
  renderDefault: (props: AbstainReasonsInputProps) => ReactNode;
}

const bannerBase: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 6,
  marginBottom: 12,
  fontSize: 13,
  lineHeight: 1.45,
};

const criticalBanner: CSSProperties = {
  ...bannerBase,
  background: "#FEF2F2",
  border: "1px solid #DC2626",
  color: "#991B1B",
  fontWeight: 600,
};

const cautionBanner: CSSProperties = {
  ...bannerBase,
  background: "#FFFBEB",
  border: "1px solid #D97706",
  color: "#92400E",
};

const listBox: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  marginBottom: 8,
  fontSize: 13,
  lineHeight: 1.5,
};

const criticalList: CSSProperties = {
  ...listBox,
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  color: "#7F1D1D",
};

const cautionList: CSSProperties = {
  ...listBox,
  background: "#FFFBEB",
  border: "1px solid #FDE68A",
  color: "#78350F",
};

function codesFromValue(value: AbstainReasonItem[] | undefined): string[] {
  if (!value || value.length === 0) {
    return [];
  }
  return value
    .map((item) => item.code)
    .filter((code): code is string => Boolean(code));
}

export function AbstainReasonsInput(props: AbstainReasonsInputProps) {
  const codes = codesFromValue(props.value);
  const { sensitive, general } = groupAbstainReasons(codes);

  if (codes.length === 0) {
    return <>{props.renderDefault(props)}</>;
  }

  return (
    <div>
      {sensitive.length > 0 ? (
        <div style={criticalBanner}>
          Conteúdo sensível — não aprove sem corrigir o texto (ex.: menção à
          persona interna). Este motivo não é um aviso de qualidade geral.
        </div>
      ) : (
        <div style={cautionBanner}>
          Motivos de qualidade geral — conferir os campos apontados antes de
          aprovar.
        </div>
      )}

      {sensitive.length > 0 ? (
        <div style={criticalList}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            ⚠ Conteúdo sensível
          </div>
          {sensitive.map((code) => (
            <div key={code}>{code}</div>
          ))}
        </div>
      ) : null}

      {general.length > 0 ? (
        <div style={cautionList}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Qualidade geral</div>
          {general.map((code) => (
            <div key={code}>{code}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
