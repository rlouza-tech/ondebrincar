import { StructureBuilder } from "sanity/structure";

const hoje = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD avaliado em runtime

export const structure = (S: StructureBuilder) =>
  S.list()
    .title("Onde Brincar")
    .items([
      // ── 🟢 No ar — publicadas e operando (US-O5 + US-O6) ─────────────
      S.listItem()
        .title("🟢 No ar")
        .child(
          S.list()
            .title("🟢 No ar")
            .items([
              S.listItem()
                .title("📋 Todas no ar")
                .child(
                  S.documentList()
                    .title("No ar — publicadas, operando, data válida")
                    .filter(
                      '_type == "atracao" && !(_originalId in path("drafts.**")) && status == "operando" && (!defined(proxima_data) || proxima_data >= $hoje)',
                    )
                    .params({ hoje: hoje() })
                    .defaultOrdering([{ field: "nome", direction: "asc" }]),
                ),

              // US-O6: subseção data vencida (ainda no ar — candidatas a mark-expired)
              S.listItem()
                .title("⚠️ Data vencida — verificar (ainda no ar)")
                .child(
                  S.documentList()
                    .title("⚠️ Data vencida — publicadas, operando, data passada")
                    .filter(
                      '_type == "atracao" && !(_originalId in path("drafts.**")) && status == "operando" && defined(proxima_data) && proxima_data < $hoje',
                    )
                    .params({ hoje: hoje() })
                    .defaultOrdering([{ field: "proxima_data", direction: "asc" }]),
                ),
            ]),
        ),

      // ── 📝 A publicar — todos os drafts (US-O5) ───────────────────────
      S.listItem()
        .title("📝 A publicar")
        .child(
          S.documentList()
            .title("A publicar — drafts")
            .filter('_type == "atracao" && _originalId in path("drafts.**")')
            .defaultOrdering([{ field: "_updatedAt", direction: "desc" }]),
        ),

      // ── ⏸ Fora do ar — publicadas, não operando (US-O5) ──────────────
      S.listItem()
        .title("⏸ Fora do ar")
        .child(
          S.documentList()
            .title("Fora do ar — publicadas e não operando")
            .filter(
              '_type == "atracao" && !(_originalId in path("drafts.**")) && status != "operando"',
            )
            .defaultOrdering([{ field: "nome", direction: "asc" }]),
        ),

      S.divider(),

      // ── Todas as atrações (utilitário) ────────────────────────────────
      S.listItem()
        .title("Atrações")
        .icon(() => "🎡")
        .child(
          S.documentList()
            .title("Todas as Atrações")
            .filter('_type == "atracao"')
            .defaultOrdering([{ field: "nome", direction: "asc" }]),
        ),

      S.divider(),

      // ── Por status ────────────────────────────────────────────────────
      S.listItem()
        .title("Por Status")
        .child(
          S.list()
            .title("Por Status")
            .items([
              S.listItem()
                .title("Operando")
                .child(
                  S.documentList()
                    .title("Operando")
                    .filter('_type == "atracao" && status == "operando"')
                    .defaultOrdering([{ field: "nome", direction: "asc" }]),
                ),
              S.listItem()
                .title("Encerrada")
                .child(
                  S.documentList()
                    .title("Encerrada")
                    .filter('_type == "atracao" && status == "encerrada"')
                    .defaultOrdering([{ field: "nome", direction: "asc" }]),
                ),
              S.listItem()
                .title("Em obras")
                .child(
                  S.documentList()
                    .title("Em obras")
                    .filter('_type == "atracao" && status == "em_obras"')
                    .defaultOrdering([{ field: "nome", direction: "asc" }]),
                ),
              S.listItem()
                .title("Esgotada")
                .child(
                  S.documentList()
                    .title("Esgotada")
                    .filter('_type == "atracao" && status == "esgotada"')
                    .defaultOrdering([{ field: "nome", direction: "asc" }]),
                ),
            ]),
        ),
    ]);
