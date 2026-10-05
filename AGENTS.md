# Instruções operacionais

- Consulte `docs/GDD.md` para a especificação integral (visão final) e `docs/MVP_SCOPE.md` para o escopo jogável atual. Para tarefas específicas, use `docs/WORLD_BIBLE.md`, `docs/SYSTEMS.md`, `docs/UI_ART.md`, `docs/AI_DESIGN.md`, `docs/TECHNICAL_ARCHITECTURE.md` e `docs/TEST_PLAN.md`.
- Preserve a hierarquia Reino → Feudo → Província → Assentamento, as contagens canônicas e a distinção entre posse legal, administração, ocupação e suserania.
- Mantenha o motor de simulação em `src/engine`, independente de React. `src/ui` contém apenas apresentação e estado transitório.
- Toda mudança persistente de regra deve atualizar testes, documentação técnica e `PROGRESS.md`.
- Não apresente sistemas futuros como concluídos nem crie ações sem consequência real.
- Execute `npm test`, `npm run test:ui` e `npm run build` antes de declarar uma etapa concluída.
