# PulseTrack

**Acompanhamento consciente de impulsividade, compulsões e oscilações de humor.**

PulseTrack é um web app simples, offline-first e acessível, criado para ajudar pessoas neurodivergentes (especialmente com TDAH, desregulação emocional e suspeita de bipolaridade) a registrarem e compreenderem padrões de comportamentos impulsivos e compulsivos.

### Principais funcionalidades

- Registro diário de humor, energia, gatilhos e comportamentos
- Categorias personalizáveis (Validação, Financeira, Alimentar, Digital, Sexual e Outros)
- Acompanhamento de oscilações de humor e relação com impulsividade
- Insights automáticos sobre padrões: humor predominante por categoria, taxa de ação automática por categoria, comportamentos concentrados em alta energia e alerta de piora/melhora em relação ao período anterior
- Relatórios em PDF e CSV prontos para levar ao psiquiatra ou psicólogo
- Design pensado para neurodivergentes: interface limpa, baixa estimulação, bom contraste e respeito a `prefers-reduced-motion`
- Funciona 100% offline — sem requisições a serviços externos (fontes auto-hospedadas e dados salvos no navegador)

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

### Privacidade

Os registros ficam no `localStorage` do navegador, sem criptografia e sem envio para servidores. Em dispositivos compartilhados, exporte um backup (aba Categorias) e apague os registros ao terminar.

### Filosofia do projeto

O PulseTrack não é um app de produtividade nem de "corrigir" comportamentos.  
É uma ferramenta de **observação compassiva** — para gerar autoconhecimento e material claro e objetivo para profissionais de saúde mental.

---
