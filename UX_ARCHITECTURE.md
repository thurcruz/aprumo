# Aprumo — Arquitetura de experiência

## Tese

A pessoa diz onde quer chegar. A Aprumo monta um plano, acompanha a execução e adapta o plano conforme a vida acontece.

**Diagnóstico → Plano → Execução → Adaptação**

Cada superfície deve ajudar o usuário a responder: onde quero chegar, o que faço hoje e o que precisa mudar.

## Navegação principal

- **Hoje:** a próxima ação do plano, o dia (hábitos, agenda, foco) e como a pessoa está. Nada de painel analítico vazio.
- **Comunidade:** mural, desafios, círculos e votação, com compartilhamento voluntário.
- **Pri:** conversa, diagnóstico e ajuste do plano. Também atravessa o app pelo botão flutuante.
- **Planos:** planos prontos de algumas semanas que viram hábitos na rotina.
- **Extensões:** Finanças, Treino e sono, Repertório e Antivício. Opcionais, sem custo; aparecem em Hoje quando ativadas.

Foco é a ferramenta central de execução: abre ligado a uma tarefa, hábito ou meta (`/foco?tarefa=`) e o tempo focado aparece junto dela.

## Onboarding = diagnóstico

Uma conversa curta com a Pri (nome, destino em 90 dias, área, obstáculo, tempo por dia, período) gera uma meta e de 2 a 4 ações testáveis para as primeiras 4 semanas. A pessoa confere antes de gravar. Se a IA falhar, sempre há um plano simples para começar.

## Free × Aprumo+

- **Free:** diagnóstico e plano inicial (créditos de boas-vindas da Pri), e todas as ferramentas básicas — hábitos, agenda, metas, foco, planos prontos, extensões.
- **Aprumo+:** acompanhamento e adaptação contínua — conversas com a Pri ao longo do tempo, revisão de ciclos, análises que cruzam áreas, voz natural e WhatsApp.

Aprumo+ nunca bloqueia ferramenta básica.

## Modelo das telas

1. Uma pergunta ou intenção dominante.
2. Uma ação primária visível.
3. Dados interpretados no contexto, sem dashboard corporativo.
4. Detalhes sob demanda (progressive disclosure).
5. Feedback imediato e linguagem não punitiva.

## Métricas transparentes

- **Constância:** dias em que a ação prevista foi cumprida ÷ dias em que estava prevista, no período escolhido.
- **Disciplina:** compromissos concluídos ÷ compromissos assumidos, exibindo também o volume absoluto para evitar uma nota opaca.
- **Repasses:** quantidade e taxa de compromissos adiados, separando repasses concluídos dos novamente adiados.

As métricas devem sempre mostrar período, numerador e denominador. Elas descrevem comportamento; não definem valor pessoal.

## Privacidade social e IA

- Nenhum dado privado é publicado automaticamente.
- Financeiro, humor, Antivício e conversas com a IA são privados por padrão.
- Compartilhamento é granular, revogável e explicado antes da confirmação.
- Pri deve explicar quais dados sustentam cada insight e permitir desligar fontes de contexto.

## Conceito: marketplace de planos (não construir agora)

Planos já são dados, não telas: um modelo (`RoutinePlanTemplate`) gera hábitos com início e fim, e a Pri adapta qualquer modelo à rotina. Isso permite, no futuro, planos publicados por terceiros (treinadores, terapeutas, criadores) sem mudar a execução:

- **Oferta:** autor publica um modelo (etapas, semanas, perguntas). Hoje o catálogo é curado e mora no código.
- **Confiança:** revisão antes de publicar, avaliações vindas de quem concluiu o ciclo (constância real, não estrelas soltas).
- **Receita:** gratuito, pago avulso ou incluso no Aprumo+, com repasse ao autor.

Pré-requisitos antes de começar: modelos em tabela (não em código), autoria e versionamento, e evidência de que planos prontos são adotados e concluídos.

## Próximas camadas

1. Revisão de ciclo com a Pri ao fim das 4 semanas (Aprumo+): o que funcionou, o que ajustar, próximo ciclo.
2. Modelo de eventos para compromissos, conclusões e repasses.
3. Grupos, desafios e Aprumo Partner com ranking opcional.
4. Biblioteca de intervenções do Antivício revisada a partir de evidência científica confiável.
