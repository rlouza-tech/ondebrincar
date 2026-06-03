import { StructureBuilder } from "sanity/structure";

const hoje = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD avaliado em runtime

export const structure = (S: StructureBuilder) =>
  S.list()
    .title("Onde Brincar")
    .items([
      // ── Fluxo editorial ───────────────────────────────────────────────
      S.listItem()
        .title("🔴 Revisar agora")
        .child(
          S.documentList()
            .title("Revisar agora — needs_human")
            .filter('_type == "atracao" && review_status == "needs_human"')
            .defaultOrdering([{ field: "nome", direction: "asc" }]),
        ),

      S.listItem()
        .title("✅ Prontas pra publicar")
        .child(
          S.documentList()
            .title("Prontas pra publicar — auto_ok")
            .filter('_type == "atracao" && review_status == "auto_ok" && (!defined(proxima_data) || proxima_data >= $hoje)')
            .params({ hoje: hoje() })
            .defaultOrdering([{ field: "nome", direction: "asc" }]),
        ),

      S.listItem()
        .title("🟢 Ativas")
        .child(
          S.documentList()
            .title("Ativas — publicadas com data válida")
            .filter('_type == "atracao" && !(_id in path("drafts.**")) && defined(proxima_data) && proxima_data >= $hoje')
            .params({ hoje: hoje() })
            .defaultOrdering([{ field: "proxima_data", direction: "asc" }]),
        ),

      // ── Expiradas (proxima_data < hoje) ───────────────────────────────
      S.listItem()
        .title("⚠️ Expiradas")
        .child(
          S.documentList()
            .title("Expiradas — proxima_data vencida")
            .filter('_type == "atracao" && defined(proxima_data) && proxima_data < $hoje')
            .params({ hoje: hoje() })
            .defaultOrdering([{ field: "proxima_data", direction: "asc" }]),
        ),

      S.divider(),

      // ── Todas as atrações ──────────────────────────────────────────────
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
