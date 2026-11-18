# PulseTrack

**Acompanhamento consciente de impulsividade, compulsões e oscilações de humor.**

PulseTrack é um web app simples, local-first e acessível, criado para ajudar pessoas neurodivergentes (especialmente com TDAH, desregulação emocional e suspeita de bipolaridade) a registrarem e compreenderem padrões de comportamentos impulsivos e compulsivos.

### Principais funcionalidades

- Onboarding em 3 telas (retomável e com persistência incremental) com pacotes opcionais de categorias: TDAH, bipolaridade, compulsões, autismo/sensorial e geral
- Registro diário em três profundidades (Rápido, Padrão, Completo), separando impulso contido de comportamento realizado
- Visão diária consolidada no Histórico: registros do dia em ordem cronológica, com detalhes expansíveis, edição e exclusão confirmada
- Rascunho automático com retomada e opção de mover um rascunho de ontem para hoje
- Observações (hipóteses pessoais) com janela de datas e comparação com o período anterior, sem veredito automático
- Categorias personalizáveis (Validação, Financeira, Alimentar, Digital, Sexual e Outros)
- Acompanhamento de oscilações de humor e relação com impulsividade
- Insights automáticos sobre padrões: humor predominante por categoria, taxa de ação automática por categoria, comportamentos concentrados em alta energia e alerta de piora/melhora em relação ao período anterior
- Relatórios em PDF e CSV prontos para levar ao psiquiatra ou psicólogo
- Design pensado para neurodivergentes: interface limpa, baixa estimulação, bom contraste e respeito a `prefers-reduced-motion`
- Não faz chamadas a serviços externos: fontes auto-hospedadas, processamento no navegador e dados salvos localmente. Isso não equivale a garantir a abertura do app sem conexão — veja [Funcionamento offline e armazenamento](#funcionamento-offline-e-armazenamento).

### Para quem é

- Pessoas com TDAH e dificuldades de controle de impulsos
- Quem lida com compulsões (alimentação, gastos, validação, hiperestimulação digital, sexual)
- Pessoas que apresentam oscilações de humor
- Qualquer pessoa que queira observar padrões de comportamento de forma estruturada e sem julgamento

### Desenvolvimento

Requisitos: Node 20+ (ou Bun) e npm.

```bash
bun install        # ou: npm install
bun run dev        # servidor de desenvolvimento em http://localhost:3000
bun run build      # build de produção em dist/
bun run lint       # typecheck estrito (tsc --noEmit)
bun run test       # testes unitários (Vitest + Testing Library)
```

A stack é React 19 + TypeScript (modo `strict`) + Vite 8 + Tailwind 4. Não há backend: todo o estado vive no `localStorage`, e o jsPDF é carregado sob demanda apenas quando o relatório é solicitado.

### Onboarding e preferências

O onboarding tem três perguntas, todas com consequência visível e persistência imediata:

| Pergunta | Onde fica salvo | O que altera | Onde editar depois |
| --- | --- | --- | --- |
| Áreas de foco | `preferences.focusAreas` | Destaca as áreas escolhidas no início do registro; nunca esconde pilares | Categorias → Áreas de foco |
| Pacotes de categorias | `categories` e `preferences.packageIds` | Ativa itens já existentes, sem criar ou duplicar categorias | Categorias → ativar/desativar itens e categorias |
| Ritmo e conforto | `preferences.defaultRecordLevel`, `theme` e `reduceMotion` | Define profundidade inicial, aparência e movimento | Categorias ou barra de aparência no topo |

A pergunta de perfil foi removida porque não alterava o app. Valores antigos de `profileHint` são preservados no armazenamento, mas não são lidos nem exibidos. Lembretes automáticos não estão disponíveis nesta versão: o app não envia notificações e preferências antigas de lembrete são carregadas como inativas.

### Funcionamento offline e armazenamento

O PulseTrack não tem backend nem envia registros para servidores. Isso vale para o que o app faz com os dados, mas não significa que ele possa ser aberto em qualquer situação sem internet. Os comportamentos são diferentes:

| Situação | O que acontece |
| --- | --- |
| Dados armazenados localmente | Registros, categorias, preferências, experimentos e rascunhos ficam no `localStorage` deste navegador e deste dispositivo. Não há conta, nuvem nem sincronização entre dispositivos. |
| Uso sem conexão depois que o app já está aberto | O app continua funcionando na aba carregada, pois não depende de APIs externas. Recursos carregados sob demanda podem não estar disponíveis se nunca tiverem sido baixados. |
| Abrir o app offline depois de fechar o navegador | Não é garantido. O projeto **não implementa PWA**: não há manifest, service worker nem estratégia de cache do app. O cache HTTP comum do navegador pode manter alguns arquivos, mas isso não é uma promessa de funcionamento offline. |
| Sincronização entre dispositivos | Não existe. Para levar os dados a outro navegador ou dispositivo, use a exportação manual de backup JSON. |
| Relatórios em PDF | A biblioteca de PDF é carregada sob demanda. Gerar um PDF sem conexão depende de esse recurso já ter sido baixado e permanecer no cache do navegador; o CSV é gerado localmente sem essa dependência. |

O aplicativo não é instalável como PWA nesta versão. Adicionar esse suporte exigiria manifest, ícones, service worker e uma estratégia de atualização; isso não foi feito porque não há infraestrutura de cache no projeto e uma atualização mal coordenada poderia prender o usuário em uma versão antiga.

#### Limites do `localStorage`

- Os dados podem ser perdidos se você limpar os dados do site/navegador, usar navegação privada, trocar de dispositivo ou reinstalar o navegador.
- O `localStorage` não é criptografado e não é um backup. Qualquer pessoa com acesso ao mesmo perfil do navegador pode ler os registros.
- O espaço disponível é limitado e pode variar entre navegadores; o app não envia cópias para nenhum servidor.
- Exporte backups JSON regularmente pela aba **Categorias** e guarde o arquivo em local seguro. A importação mostra uma prévia e baixa uma cópia dos dados atuais antes de substituir qualquer coisa.
- Backups nas versões 2 e 3 são aceitos; versões futuras são recusadas em vez de interpretadas por suposição. Campos desconhecidos dentro de uma versão aceita são ignorados durante a normalização — o JSON é tratado apenas como dados, nunca como instruções.

### Privacidade

Os registros ficam no `localStorage` do navegador, sem criptografia e sem envio para servidores. Em dispositivos compartilhados, exporte um backup (aba Categorias) e apague os registros ao terminar.

### Filosofia do projeto

O PulseTrack não é um app de produtividade nem de "corrigir" comportamentos.  
É uma ferramenta de **observação compassiva** — para gerar autoconhecimento e material claro e objetivo para profissionais de saúde mental.

---
