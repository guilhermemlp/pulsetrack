# PulseTrack — Documento Mestre de Melhorias
## Plano técnico, funcional e de usabilidade para execução por modelo de desenvolvimento (DeepSeek)

**Projeto:** `guilhermemlp/pulsetrack`  
**Objetivo deste documento:** orientar uma execução incremental e verificável das melhorias identificadas na auditoria do PulseTrack.  
**Regra central:** preservar a proposta do produto, corrigir primeiro integridade dos dados e coerência dos fluxos, e só depois evoluir a experiência.

---

## 1. Instruções obrigatórias para o modelo executor

Você atuará como engenheiro de software responsável por implementar este plano no repositório PulseTrack. Leia o código atual antes de alterar qualquer arquivo. A auditoria que originou este documento foi estática; portanto, trate os achados abaixo como hipóteses técnicas a confirmar no estado atual do repositório, não como autorização para editar às cegas.

### 1.1 Forma de trabalho

1. Inspecione a estrutura do projeto, `README`, dependências, scripts, tipos, persistência, componentes e testes existentes.
2. Confirme cada achado no código atual e identifique os arquivos e funções realmente envolvidos. Se a implementação tiver mudado, adapte o plano à arquitetura atual e registre a diferença.
3. Antes de editar, apresente um plano curto da etapa: problema, causa identificada, arquivos que pretende alterar, estratégia e testes.
4. Execute uma prioridade por vez. Não misture refatorações amplas com correções pontuais.
5. Faça alterações pequenas, coesas e compatíveis com os padrões já usados no projeto.
6. Não remova funcionalidades existentes sem justificativa e sem avaliar impacto.
7. Não introduza dependências novas quando a solução puder ser implementada com os recursos já instalados.
8. Não altere a identidade visual ou reescreva a aplicação inteira.
9. Não invente funcionalidades que não estejam descritas neste documento.
10. Depois de cada etapa, execute os testes, lint, typecheck e build disponíveis. Se algum comando não existir ou não puder ser executado, informe explicitamente.
11. Ao final de cada prioridade, apresente: arquivos alterados, comportamento anterior, comportamento novo, testes realizados, resultado e limitações remanescentes.
12. Não declare uma tarefa concluída apenas porque o código compila. Verifique os critérios de aceite e os fluxos de interação.

### 1.2 Restrições de produto

O PulseTrack é uma ferramenta de autorregistro e observação longitudinal de comportamentos, impulsos, humor, energia, sono, gatilhos e padrões. Não é uma ferramenta de diagnóstico, não deve sugerir diagnósticos e não deve prescrever condutas clínicas.

Preserve estes princípios:

- Linguagem acolhedora, neutra e não moralizante.
- O registro é uma ferramenta de observação, não uma obrigação.
- Não criar streaks, punições, notas de desempenho ou mensagens que induzam culpa por não registrar.
- Não transformar correlações observadas em causalidade.
- Não afirmar que um padrão comprova bipolaridade, compulsão, TDAH ou qualquer condição.
- Distinguir claramente vontade/impulso, comportamento realizado e consequência/prejuízo.
- Permitir que a pessoa não saiba, não queira responder ou não tenha informação suficiente.
- Não exigir preenchimento de campos que não sejam essenciais para salvar um registro.
- Preservar a possibilidade de registro rápido e aprofundamento posterior.
- Preservar os dados locais do usuário; nenhuma alteração pode apagar ou substituir dados silenciosamente.

### 1.3 Estratégia de execução

Siga esta ordem:

| Ordem | Prioridade | Escopo |
|---|---|---|
| 1 | P0 — Integridade e proteção dos dados | Rascunhos, importação de backup e dados de exemplo |
| 2 | P1 — Coerência funcional | Semântica de impulso/episódio, onboarding, preferências e lembretes |
| 3 | P2 — Experiência, acessibilidade e distribuição | Visão diária, acessibilidade de diálogos e estratégia offline/PWA |

Não avance para uma prioridade seguinte enquanto a anterior não tiver critérios de aceite atendidos ou bloqueios documentados. Se encontrar um problema adicional que possa causar perda de dados, interrompa e apresente-o como bloqueador.

---

# 2. P0 — Integridade e proteção dos dados

**Objetivo:** impedir perda acidental de informações e garantir que um registro iniciado possa ser retomado sem alteração ou descarte indevido de respostas.

**Criticidade:** máxima.  
**Condição para concluir P0:** os três itens abaixo precisam passar por testes de regressão, incluindo cenários com dados preenchidos e cenários de cancelamento.

## P0.1 — Corrigir a restauração completa de rascunhos

**Área provável:** `src/components/DailyLogForm/index.tsx` e utilitários associados à persistência de rascunhos.

### Problema a resolver

O mecanismo de rascunho aparenta não preservar todos os dados necessários para reconstruir o formulário. Foram identificados três riscos específicos:

- O snapshot do rascunho não inclui metadados como `entryType`, `level` e `quickImpulseAnswer`.
- A restauração não trata corretamente valores que são objetos. `moodIntensity`, por exemplo, pode ser um objeto, mas a leitura atual aparenta tratar arrays, números, strings e booleanos, retornando um fallback para objetos.
- A verificação `hasContent` não contempla todos os campos disponíveis. Informações de sono, sinais de ativação, duração de estados e outros campos podem ser preenchidos sem que o rascunho seja reconhecido como contendo dados.

O resultado possível é o usuário fechar ou atualizar a página, voltar ao formulário e encontrar respostas perdidas, campos redefinidos ou um rascunho descartado como vazio.

### Resultado esperado

O rascunho deve reconstruir o formulário com o mesmo tipo de registro, nível de profundidade e respostas que existiam no momento em que foi salvo. Um rascunho com qualquer campo relevante preenchido deve ser preservado.

### Trabalho técnico solicitado

1. Mapear o modelo completo do formulário:
   - campos simples;
   - campos numéricos;
   - booleanos;
   - arrays;
   - objetos aninhados;
   - campos opcionais;
   - metadados de controle do formulário.
2. Identificar o tipo TypeScript utilizado para o estado do formulário e verificar se o formato persistido corresponde a ele.
3. Criar ou ajustar uma estrutura única e tipada para o snapshot do rascunho. Evitar manter uma lista de campos de gravação e outra lista divergente de campos de restauração.
4. Incluir no snapshot, no mínimo, todos os dados necessários para reconstruir:
   - tipo de entrada (`entryType`, ou o equivalente atual);
   - profundidade (`level`);
   - resposta de impulso rápido (`quickImpulseAnswer`, se ainda fizer parte do fluxo);
   - humor e intensidade de cada humor;
   - energia;
   - sono;
   - comportamentos/categorias;
   - gatilhos;
   - contexto;
   - consciência do impulso;
   - resistência ou não realização do comportamento;
   - sentimentos durante e depois;
   - sinais de ativação;
   - duração e oscilação de estados;
   - horários e demais informações de sono;
   - observações em texto livre.
5. Restaurar objetos e arrays sem convertê-los em valores vazios. Preferir validação e normalização explícitas, com tipos claros.
6. Tratar rascunhos antigos de forma compatível. Se o formato persistido mudar, criar uma estratégia de migração ou fallback que não descarte dados antigos silenciosamente.
7. Rever `hasContent` para contemplar todos os campos relevantes. Não considerar apenas os campos mais comuns.
8. Evitar que valores padrão automaticamente inicializados sejam interpretados como respostas efetivamente preenchidas, quando isso puder gerar falsos rascunhos.
9. Definir quando o rascunho é atualizado e quando pode ser removido:
   - salvar alterações de forma confiável;
   - não apagar o rascunho ao navegar entre etapas;
   - remover apenas após conclusão bem-sucedida ou descarte explicitamente confirmado;
   - preservar o rascunho em caso de erro ao salvar o registro final.
10. Se houver múltiplos tipos de formulário, garantir que cada um restaure seu próprio estado e não herde indevidamente dados de outro tipo.

### Cenários obrigatórios de teste

- Iniciar um check-in, preencher humor, intensidade, energia e observações, fechar/recarregar a página e retomar.
- Iniciar um registro de episódio, preencher os campos específicos do episódio, fechar/recarregar e retomar.
- Preencher somente um objeto, como intensidade de humor, e confirmar que o rascunho é reconhecido.
- Preencher somente um campo de sono ou sinal de ativação e confirmar que o rascunho não é descartado.
- Preencher arrays e objetos aninhados e verificar igualdade entre estado salvo e estado restaurado.
- Alternar entre níveis Rápido, Padrão e Completo, se permitido, e verificar se a escolha é preservada.
- Concluir o registro e confirmar que o rascunho correspondente é removido.
- Simular falha na persistência final e confirmar que o rascunho continua disponível.
- Abrir um rascunho antigo, se houver formato legado, e verificar compatibilidade.

### Critérios de aceite

- [ ] Todos os campos respondidos são restaurados com seus valores originais.
- [ ] O tipo e o nível do registro são preservados.
- [ ] Objetos, arrays, números, strings e booleanos são restaurados corretamente.
- [ ] Nenhum campo relevante preenchido é ignorado por `hasContent`.
- [ ] Rascunhos não são apagados antes da conclusão bem-sucedida ou do descarte confirmado.
- [ ] Formatos antigos são tratados sem perda silenciosa de dados.
- [ ] Testes automatizados cobrem os casos acima.
- [ ] Build, typecheck e lint passam, quando disponíveis.

---

## P0.2 — Proteger a importação de backup JSON

**Área provável:** `src/components/CategoriesView.tsx` e lógica de importação/persistência em `src/App.tsx` ou utilitários relacionados.

### Problema a resolver

A importação de um backup aparenta substituir registros, categorias e experimentos imediatamente. Uma seleção equivocada de arquivo ou uma interpretação incorreta do usuário pode eliminar o conteúdo local atual.

### Resultado esperado

A importação deve ser uma operação explícita, compreensível, validada e protegida contra substituição acidental. O usuário deve saber o que será substituído antes de confirmar.

### Trabalho técnico solicitado

1. Localizar o fluxo completo de importação: seleção do arquivo, leitura, parse, validação, confirmação e gravação.
2. Separar a leitura/validação do arquivo da efetiva substituição dos dados.
3. Após selecionar o arquivo, validar sua estrutura antes de exibir a confirmação.
4. Exibir uma prévia com informações úteis, quando disponíveis:
   - quantidade de registros;
   - quantidade de categorias;
   - quantidade de experimentos;
   - data ou versão do backup;
   - indicação de que os dados locais atuais serão substituídos.
5. Se o arquivo for inválido, incompatível ou incompleto, apresentar mensagem clara e não modificar o estado atual.
6. Exigir confirmação explícita em uma etapa separada. A ação principal deve indicar claramente que haverá substituição dos dados.
7. Antes de substituir, oferecer ou executar uma cópia de segurança do estado atual. A solução preferencial é gerar um backup local para download antes da importação, sem depender de um servidor.
8. A gravação deve ser transacional do ponto de vista da aplicação:
   - validar todos os dados;
   - preparar o novo estado;
   - só então efetivar a substituição;
   - se ocorrer erro, manter o estado anterior.
9. Evitar substituir parcialmente registros, categorias e experimentos.
10. Preservar compatibilidade com versões anteriores do formato de backup, se o projeto já possuir versionamento.
11. Não aceitar propriedades inesperadas como comandos ou instruções. Tratar o JSON exclusivamente como dados.
12. Garantir que a interface informe o resultado real da operação, sem mostrar sucesso antes de a persistência terminar.

### Texto e comportamento de interface

A confirmação deve deixar explícito que a importação substitui os dados locais atuais. Evitar textos vagos como “Continuar?” ou “Deseja importar?”.

Exemplo de intenção da mensagem:

> “Este backup contém X registros, Y categorias e Z experimentos. A importação substituirá os dados atualmente salvos neste navegador. Recomendamos salvar uma cópia dos dados atuais antes de continuar.”

Os números devem vir do arquivo validado, nunca de valores fixos.

### Cenários obrigatórios de teste

- Importar um backup válido e confirmar a substituição.
- Selecionar um backup válido e cancelar na confirmação: estado atual deve permanecer intacto.
- Selecionar arquivo JSON inválido: nenhum dado pode ser alterado.
- Selecionar JSON válido sintaticamente, mas incompatível com o esquema: nenhum dado pode ser alterado.
- Simular falha durante a persistência: estado anterior deve permanecer íntegro.
- Importar backup sem experimentos ou sem categorias, se o formato permitir.
- Importar backup de versão anterior, se houver suporte.
- Verificar se o backup de segurança contém os dados locais anteriores à importação.

### Critérios de aceite

- [ ] A importação não altera dados antes da confirmação.
- [ ] A prévia apresenta contagens reais do arquivo.
- [ ] A confirmação informa claramente que haverá substituição.
- [ ] Arquivos inválidos ou incompatíveis não alteram o estado atual.
- [ ] O usuário pode cancelar sem qualquer alteração.
- [ ] Existe backup de segurança antes da substituição ou uma alternativa explícita e segura.
- [ ] A atualização de registros, categorias e experimentos é atômica do ponto de vista da aplicação.
- [ ] Erros são apresentados de forma compreensível.
- [ ] Testes cobrem sucesso, cancelamento, arquivo inválido e falha de persistência.

---

## P0.3 — Proteger o carregamento de dados de exemplo

**Área provável:** `src/components/CategoriesView.tsx`, `src/App.tsx` e função `handleLoadSampleData` ou equivalente.

### Problema a resolver

O carregamento de dados de exemplo aparenta executar `setEntries(sample)` e pode substituir os registros reais existentes. A opção fica acessível na área de Categorias mesmo quando já há dados.

### Resultado esperado

Dados de demonstração nunca podem substituir silenciosamente dados reais. O modo de demonstração deve ser claramente identificado e sua operação precisa ser reversível ou protegida.

### Trabalho técnico solicitado

1. Confirmar o comportamento atual da ação de carregar exemplos.
2. Verificar se a ação substitui somente registros ou também categorias, experimentos e outras estruturas.
3. Se já existirem dados do usuário, impedir a substituição direta.
4. Apresentar confirmação com:
   - aviso de que os dados atuais serão substituídos, caso essa ainda seja a semântica escolhida;
   - quantidade de registros atuais;
   - quantidade de registros de exemplo;
   - opção clara de cancelar.
5. Preferencialmente, alterar a experiência para uma destas abordagens, escolhendo a que melhor se encaixar na arquitetura:
   - carregar os exemplos em um espaço de demonstração isolado; ou
   - permitir a inclusão de exemplos apenas em uma instalação sem registros; ou
   - oferecer uma ação explícita de “substituir dados pelos exemplos”, com backup prévio.
6. Não misturar registros de exemplo com registros reais sem identificá-los. Se houver modo de demonstração, os dados precisam ter identificação inequívoca e não contaminar relatórios reais.
7. Se o usuário optar por limpar dados para começar novamente, essa ação deve ser distinta de “carregar exemplos”.
8. Não disparar a operação apenas por abrir a tela ou por selecionar uma opção.
9. Garantir que cancelar mantenha o estado integralmente inalterado.

### Cenários obrigatórios de teste

- Usuário sem registros carrega dados de exemplo.
- Usuário com registros reais tenta carregar exemplos e cancela.
- Usuário com registros reais confirma a operação, caso a substituição continue permitida.
- Verificar que relatórios e métricas não misturam exemplos com dados reais sem identificação.
- Recarregar a aplicação e verificar persistência consistente.
- Confirmar que nenhuma outra estrutura é apagada de forma não informada.

### Critérios de aceite

- [ ] Dados reais nunca são substituídos sem confirmação explícita.
- [ ] A interface explica o impacto da ação.
- [ ] Cancelar mantém os dados inalterados.
- [ ] Dados de exemplo são identificáveis ou isolados.
- [ ] O comportamento é consistente após recarregar a aplicação.
- [ ] Testes cobrem instalação vazia e instalação com dados existentes.

---

# 3. P1 — Coerência funcional entre registro, onboarding e análise

**Objetivo:** fazer com que as opções apresentadas ao usuário tenham efeito real e que a análise represente corretamente o que foi registrado.

## P1.1 — Diferenciar impulso, comportamento realizado e episódio

**Área provável:** `src/utils/analytics.ts`, modelos de dados e componentes de registro, histórico, dashboard e relatórios.

### Problema a resolver

A função `isEpisodeEntry` aparenta classificar qualquer registro com `behaviors.length > 0` como episódio, sem distinguir necessariamente um impulso que foi contido de um comportamento efetivamente realizado.

Isso pode fazer com que um registro de vontade de comprar, por exemplo, seja contado como episódio mesmo quando a pessoa não comprou. Essa classificação pode distorcer indicadores como quantidade de episódios, dias com episódios, dias sem episódios e evolução ao longo do tempo.

### Decisão semântica necessária

Antes de alterar a lógica, inspecione os tipos, textos da interface e significado atual dos campos. Defina e documente três conceitos:

1. **Impulso:** vontade, urgência ou desejo de realizar um comportamento. Pode existir sem ação.
2. **Comportamento realizado:** ação efetivamente executada. Pode ou não ter gerado prejuízo.
3. **Consequência ou prejuízo percebido:** impacto relatado pela pessoa. Não deve ser inferido automaticamente apenas pela existência do comportamento.

Um registro pode conter impulso sem ação, ação sem prejuízo percebido, ou impulso seguido de ação. Não force essas situações a uma única categoria.

### Resultado esperado

O sistema deve preservar o impulso contido como dado relevante, mas não contabilizá-lo automaticamente como comportamento realizado. Os indicadores devem deixar explícito o que estão contando.

### Trabalho técnico solicitado

1. Mapear os campos existentes relacionados a:
   - categoria/comportamento;
   - impulso ou vontade;
   - ação realizada;
   - resistência/contensão;
   - consciência;
   - intensidade;
   - consequência/prejuízo.
2. Verificar se o modelo atual já representa esses conceitos. Reutilize os campos existentes quando forem semanticamente adequados.
3. Não criar uma segunda fonte de verdade para a mesma informação.
4. Se o modelo não conseguir distinguir impulso de ação, propor a menor alteração de esquema necessária e planejar compatibilidade com registros antigos.
5. Rever `isEpisodeEntry` e todas as funções que dependem dela.
6. Criar funções ou predicados com nomes semanticamente claros, por exemplo:
   - `hasImpulse`;
   - `hasRealizedBehavior`;
   - `hasReportedImpact`;
   - `isEpisodeEntry`, apenas se a definição de episódio estiver documentada.
   Os nomes são sugestões; adapte à convenção atual.
7. Revisar indicadores, gráficos, insights, filtros e relatórios. Não corrigir somente a função central e deixar textos ou contagens inconsistentes.
8. Exibir separadamente, quando houver dados suficientes:
   - quantidade de impulsos registrados;
   - quantidade de comportamentos realizados;
   - quantidade de registros com consequência/prejuízo relatado.
9. Não exibir percentuais com denominadores inadequados ou amostras insuficientes.
10. Para dados históricos que não permitem distinguir impulso e ação, não inventar a informação. Marcar como classificação desconhecida/legada ou manter a semântica anterior com aviso metodológico.
11. Rever a linguagem da interface para que “episódio” não seja usado como sinônimo automático de qualquer vontade.

### Exemplo de comportamento esperado

Se a pessoa registrar:
- vontade intensa de comprar;
- percebeu o impulso;
- não realizou a compra;

o sistema deve contabilizar um impulso, mas não uma compra realizada. O registro continua relevante para análises de gatilhos, intensidade e estratégias de contenção.

Se a pessoa registrar:
- vontade de comprar;
- realizou a compra;
- relatou arrependimento ou impacto;

o sistema deve registrar os três aspectos separadamente, sem presumir que todo comportamento realizado gera prejuízo.

### Campo de humor obrigatório

Durante a revisão do formulário, verificar a exigência de selecionar ao menos um humor para salvar qualquer registro. Se essa exigência ainda existir, avaliar sua remoção ou substituição por uma opção explícita como “Não sei identificar”, “Não quero informar” ou “Sem informação neste momento”.

Não preencher “Neutro” automaticamente para permitir salvar. Ausência de informação não é equivalente a humor neutro.

### Cenários obrigatórios de teste

- Impulso registrado, comportamento não realizado.
- Impulso registrado e comportamento realizado.
- Comportamento realizado sem impulso previamente percebido.
- Comportamento realizado sem prejuízo relatado.
- Registro sem informação suficiente para classificar.
- Registros antigos sem distinção explícita.
- Conferir dashboard, histórico, insights, filtros e relatórios com os mesmos dados.
- Salvar registro sem selecionar humor, caso a nova regra permita.

### Critérios de aceite

- [ ] Impulso e ação realizada são conceitos distintos no modelo ou na semântica documentada.
- [ ] Impulso contido não é contado como ação realizada.
- [ ] Consequência/prejuízo não é presumido.
- [ ] Indicadores e relatórios usam a mesma regra semântica.
- [ ] Dados legados não recebem classificações inventadas.
- [ ] Ausência de resposta não é convertida em “Neutro”.
- [ ] Testes cobrem os cenários listados.

---

## P1.2 — Fazer as escolhas do onboarding influenciarem o aplicativo

**Área provável:** `src/components/Onboarding.tsx`, `src/App.tsx`, tela de Categorias e lógica de preferências.

### Problema a resolver

O onboarding pergunta sobre áreas de foco (`focusAreas`), perfil (`profileHint`), pacotes de categorias e preferências. Entretanto, parte dessas respostas aparenta ser apenas armazenada, sem alterar a experiência posterior. O usuário pode responder a perguntas que não produzem consequência visível.

Também existe risco de as escolhas ficarem apenas no estado local do componente até o usuário avançar, podendo ser perdidas se a aba for fechada antes.

### Resultado esperado

Cada pergunta do onboarding deve ter uma finalidade clara e observável. Se uma escolha não for utilizada, deve ser removida ou apresentada como informação opcional sem promessa de personalização.

### Trabalho técnico solicitado

1. Mapear todas as etapas, estados, opções e textos do onboarding.
2. Para cada campo, documentar:
   - onde é salvo;
   - onde é lido;
   - qual comportamento do app ele altera;
   - como o usuário pode editá-lo posteriormente.
3. Implementar persistência incremental: salvar a escolha conforme o usuário a altera ou conclui cada etapa, de modo que fechar a página não apague respostas já dadas.
4. Preservar a retomada da etapa em que o usuário parou, sem deixar o estado da etapa divergente dos dados já persistidos.
5. Fazer `focusAreas` influenciar a organização inicial do aplicativo, se essa for a intenção do produto. Exemplos possíveis:
   - destacar áreas escolhidas no início;
   - ordenar ou filtrar sugestões de categorias;
   - priorizar informações pertinentes no primeiro registro.
   Não esconder definitivamente áreas não selecionadas.
6. Fazer `profileHint` ter efeito real somente se houver uma adaptação útil e não estigmatizante. Não usar o perfil para inferir diagnóstico, personalidade clínica ou condição de saúde.
7. Se não houver uma consequência funcional clara para `profileHint`, remover a pergunta ou torná-la explicitamente opcional e informativa.
8. Garantir que os pacotes de categorias selecionados sejam aplicados sem duplicar categorias existentes.
9. Garantir que todas as escolhas possam ser alteradas depois em uma área de configurações coerente. Não prometer que algo pode ser editado em Categorias se a preferência não estiver nessa tela.
10. Rever os textos do onboarding para corresponder ao comportamento real.
11. Manter a possibilidade de pular perguntas não essenciais.
12. Evitar que o onboarding se torne mais longo ou complexo sem benefício claro.

### Critérios de aceite

- [ ] Cada pergunta tem uma finalidade documentada.
- [ ] As escolhas persistem incrementalmente.
- [ ] Fechar e reabrir o app não perde escolhas concluídas.
- [ ] `focusAreas` produz efeito visível ou a pergunta é removida/reformulada.
- [ ] `profileHint` produz efeito útil e não clínico ou a pergunta é removida/reformulada.
- [ ] Categorias selecionadas são aplicadas sem duplicação.
- [ ] Preferências podem ser editadas posteriormente no local informado pela interface.
- [ ] Textos e comportamento real estão alinhados.

---

## P1.3 — Resolver a preferência de lembrete diário

**Área provável:** `src/components/Onboarding.tsx`, preferências e infraestrutura de notificações.

### Problema a resolver

O onboarding oferece a opção “Quero um lembrete diário” e armazena `reminderOptIn` e `reminderTime`, mas aparenta não existir agendamento ou envio de notificação. A interface pode criar uma expectativa que o aplicativo não cumpre.

### Resultado esperado

O produto deve escolher uma destas soluções e manter a interface coerente:

**Opção A — Implementar lembrete funcional:** somente se a plataforma e a arquitetura suportarem notificações de maneira confiável.

**Opção B — Remover temporariamente a opção:** se ainda não houver suporte técnico real.

**Opção C — Apresentar como preferência futura:** somente se o texto deixar claro que o lembrete ainda não está ativo e não sugerir que será enviado.

### Trabalho técnico solicitado

1. Verificar a plataforma atual: aplicação web, suporte PWA, permissões e APIs disponíveis.
2. Não implementar notificações que dependam de um servidor inexistente ou que não possam funcionar com a aplicação fechada.
3. Se implementar:
   - solicitar permissão somente após uma ação explícita do usuário;
   - explicar o que será enviado e quando;
   - permitir alterar horário e desativar;
   - tratar permissão negada;
   - tratar suporte indisponível;
   - evitar notificações duplicadas;
   - respeitar fuso horário local;
   - não enviar conteúdo sensível na notificação;
   - não apresentar notificações como cobrança por não registrar.
4. Se não implementar, remover a opção funcional ou reformular a apresentação para não prometer notificações.
5. Garantir que a preferência não fique salva como ativa quando o recurso não estiver disponível.

### Critérios de aceite

- [ ] A interface não promete lembrete que não existe.
- [ ] Se houver implementação, o usuário controla ativação, horário e desativação.
- [ ] Permissões são solicitadas no momento adequado.
- [ ] Falhas e indisponibilidade são tratadas.
- [ ] Não há notificações duplicadas.
- [ ] O conteúdo não expõe dados sensíveis.

---

# 4. P2 — Experiência, acessibilidade e distribuição

**Objetivo:** melhorar a compreensão do acompanhamento ao longo do dia, tornar a navegação acessível e alinhar a promessa de funcionamento offline à implementação real.

## P2.1 — Criar uma visão diária consolidada

**Áreas prováveis:** dashboard, histórico, componentes de registro e utilitários de data.

### Problema/oportunidade

O aplicativo registra diferentes dimensões e pode permitir múltiplos registros no mesmo dia. Uma visão que mostre apenas agregações ou registros isolados pode dificultar a compreensão da sequência intradiária.

### Resultado esperado

O usuário deve conseguir visualizar, em um único lugar, os registros do dia em ordem cronológica, distinguindo check-ins, impulsos e comportamentos realizados. A visão deve ser descritiva, sem interpretar automaticamente a sequência como causa e efeito.

### Trabalho técnico solicitado

1. Inspecionar o dashboard e o histórico existentes para evitar duplicar telas ou criar uma navegação redundante.
2. Definir a unidade de visualização como dia local do usuário, respeitando o fuso horário.
3. Apresentar uma linha do tempo ou lista cronológica com:
   - horário, quando disponível;
   - tipo de registro;
   - humor/energia, se informado;
   - impulso;
   - comportamento realizado, quando houver;
   - observação ou gatilho, se houver e se for apropriado mostrar no resumo.
4. Diferenciar claramente:
   - ausência de registro;
   - registro sem informação em determinada dimensão;
   - informação explicitamente negativa ou ausência de episódio.
5. Permitir abrir um item para visualizar, editar ou excluir, respeitando as confirmações existentes.
6. Incluir estados vazios úteis e neutros, sem mensagens de cobrança.
7. Não preencher lacunas com inferências.
8. Evitar excesso de informação no primeiro nível. Usar resumo compacto com expansão para detalhes.
9. Garantir que registros no entorno da meia-noite sejam associados ao dia correto segundo a data/hora local registrada.
10. Verificar se a visão funciona com muitos registros no mesmo dia.

### Critérios de aceite

- [ ] Todos os registros do dia aparecem em ordem cronológica.
- [ ] Tipos de registro são visualmente distinguíveis e acessíveis.
- [ ] Impulso não é confundido com comportamento realizado.
- [ ] Ausência de dados não é exibida como resultado negativo.
- [ ] Edição e exclusão continuam funcionando.
- [ ] Fuso horário e mudança de dia são tratados corretamente.
- [ ] A tela não introduz interpretações clínicas ou causais.

---

## P2.2 — Melhorar acessibilidade dos diálogos e modais

**Área provável:** `src/components/ExperimentsPanel.tsx` e demais componentes que implementem diálogos.

### Problema a resolver

O modal de encerramento de experimentos aparenta possuir `role="dialog"` e `aria-modal="true"`, mas não foi identificado um gerenciamento completo de foco, suporte consistente à tecla Escape, contenção de foco ou retorno de foco ao elemento que abriu o modal.

### Resultado esperado

Todos os diálogos devem ser utilizáveis por teclado e leitores de tela, sem que o foco se perca atrás do modal.

### Trabalho técnico solicitado

1. Fazer inventário de todos os modais, diálogos, popovers e confirmações.
2. Verificar se existe componente compartilhado de diálogo. Se existir, corrigir nele antes de criar soluções específicas.
3. Ao abrir:
   - mover o foco para o título, primeiro campo ou ação adequada;
   - expor nome acessível e descrição, quando aplicável;
   - impedir interação por teclado com o conteúdo de fundo, conforme o padrão utilizado.
4. Enquanto aberto:
   - manter o foco dentro do diálogo;
   - permitir navegação previsível por Tab e Shift+Tab;
   - suportar Escape quando a operação puder ser cancelada com segurança;
   - não fechar por Escape se isso puder descartar alterações sem confirmação.
5. Ao fechar:
   - devolver o foco ao elemento que abriu o diálogo;
   - restaurar a navegação normal.
6. Garantir rótulos acessíveis para botões de ícone e campos.
7. Não depender somente de cor para indicar estados.
8. Verificar contraste, foco visível, ordem de leitura e comportamento em zoom.
9. Não adicionar `aria-*` redundante ou incorreto. Usar elementos semânticos adequados.
10. Testar os fluxos de confirmação de exclusão, encerramento de experimento e importação de backup.

### Cenários obrigatórios de teste

- Abrir e fechar modal apenas com teclado.
- Percorrer todos os controles com Tab e Shift+Tab.
- Pressionar Escape em diálogo cancelável.
- Confirmar que o foco retorna ao disparador.
- Verificar leitor de tela ou ferramenta automatizada disponível.
- Abrir modal com campos e validar nome/descrição acessíveis.
- Testar em viewport estreito e com zoom.

### Critérios de aceite

- [ ] O foco é movido corretamente ao abrir.
- [ ] O foco permanece dentro do diálogo enquanto aberto.
- [ ] Escape funciona quando seguro.
- [ ] O foco retorna ao disparador ao fechar.
- [ ] Todos os controles têm nome acessível.
- [ ] O conteúdo de fundo não recebe foco indevidamente.
- [ ] Os principais diálogos foram testados por teclado.

---

## P2.3 — Alinhar a promessa offline e avaliar PWA

**Áreas prováveis:** `README.md`, configuração de build, `public/`, `vite.config.*` ou equivalente.

### Problema a resolver

O aplicativo armazena dados localmente e pode funcionar sem chamadas a APIs externas, mas isso não garante que o próprio aplicativo consiga ser aberto sem conexão. Sem cache de recursos e estratégia de service worker, o navegador pode não conseguir carregar a aplicação depois de perder a conexão ou limpar o cache.

### Resultado esperado

A documentação deve diferenciar claramente:

- **dados armazenados localmente:** registros ficam no navegador/dispositivo;
- **uso sem conexão após o app estar carregado:** depende dos recursos já disponíveis em cache;
- **abertura offline após fechar o navegador:** depende de PWA/service worker e estratégia de cache;
- **sincronização entre dispositivos:** não existe, salvo implementação específica.

### Trabalho técnico solicitado

1. Inspecionar `README.md`, scripts, configuração de build e dependências.
2. Confirmar se há service worker, manifest e estratégia de cache.
3. Se não houver suporte PWA, corrigir a documentação para não afirmar que o app é integralmente offline.
4. Avaliar a implementação de PWA apenas se houver benefício claro e compatibilidade com a arquitetura.
5. Se implementar PWA:
   - adicionar manifest válido;
   - configurar ícones adequados;
   - definir nome e cores coerentes com o app;
   - implementar service worker com cache dos recursos estáticos necessários;
   - definir estratégia de atualização segura;
   - evitar cache de dados pessoais em mecanismos desnecessários;
   - não armazenar conteúdo sensível em cache compartilhado;
   - garantir que uma atualização não deixe o usuário preso em uma versão inconsistente.
6. Não prometer sincronização, backup em nuvem ou proteção criptográfica que não exista.
7. Documentar limites do `localStorage`, incluindo que os dados podem ser perdidos se o usuário limpar os dados do navegador ou trocar de dispositivo.
8. Preservar a orientação de exportar backups regularmente, se esse for o mecanismo disponível.

### Critérios de aceite

- [ ] README descreve corretamente o comportamento offline.
- [ ] A existência ou ausência de PWA/service worker foi verificada.
- [ ] Se PWA for implementada, os recursos essenciais carregam sem conexão após instalação/cache inicial.
- [ ] Atualizações do app não corrompem dados locais.
- [ ] Não há alegação de sincronização ou criptografia inexistente.
- [ ] Limitações do armazenamento local estão documentadas.

---

# 5. Revisão transversal — itens que devem ser verificados durante todas as etapas

Estes pontos não exigem necessariamente novas funcionalidades. Devem ser verificados enquanto as prioridades forem implementadas.

## 5.1 Consistência de linguagem

- Usar os mesmos termos para os mesmos conceitos em onboarding, formulário, histórico, dashboard e relatórios.
- Não alternar entre “impulso”, “episódio” e “comportamento” como se fossem sinônimos.
- Explicar termos potencialmente ambíguos no contexto em que aparecem.
- Preferir “não informado” a presumir um valor.
- Evitar linguagem de fracasso, recaída ou sucesso quando o app estiver apenas registrando dados, salvo se o usuário tiver definido explicitamente esse significado.

## 5.2 Integridade dos dados

- Validar dados na entrada e antes da persistência.
- Não descartar propriedades desconhecidas de backups sem uma estratégia documentada.
- Não substituir estado completo por estado parcial acidentalmente.
- Manter compatibilidade com registros anteriores sempre que possível.
- Tratar datas, fusos horários e valores ausentes de maneira consistente.
- Não criar migrações destrutivas.

## 5.3 Privacidade

- Não enviar registros pessoais a serviços externos.
- Não incluir conteúdo sensível em logs, mensagens de erro ou notificações.
- Não adicionar analytics de terceiros sem decisão explícita de produto.
- Explicar que `localStorage` não equivale a armazenamento criptografado.
- Evitar expor observações pessoais em notificações ou títulos visíveis na tela bloqueada.

## 5.4 Responsividade e interação

- Verificar os fluxos em desktop e viewport móvel.
- Não criar ações principais que dependam apenas de hover.
- Manter alvos de toque adequados.
- Não esconder ações importantes em menus pouco descobríveis.
- Preservar o padrão visual existente.

---

# 6. Plano de testes de regressão

O executor deve criar ou atualizar testes automatizados conforme a estrutura já existente. Não introduza um framework de testes novo sem necessidade justificada.

## 6.1 Testes de modelo e persistência

- Serialização e restauração de cada tipo de campo.
- Rascunho completo e parcial.
- Compatibilidade com rascunhos legados.
- Falha de gravação sem perda do rascunho.
- Importação válida, inválida, cancelada e com falha.
- Backup anterior à substituição.
- Dados de exemplo em instalação vazia e com dados existentes.

## 6.2 Testes de regras analíticas

Criar um conjunto pequeno e explícito de dados de referência contendo:

1. impulso sem ação;
2. impulso com ação;
3. ação sem impulso percebido;
4. ação sem prejuízo relatado;
5. ausência de informação suficiente;
6. registro legado.

Para cada conjunto, verificar as contagens e rótulos exibidos no dashboard, histórico e relatório.

## 6.3 Testes de onboarding

- Persistência de cada etapa.
- Retomada após recarregar.
- Alteração posterior de preferências.
- Aplicação de categorias sem duplicação.
- Coerência entre opções apresentadas e efeitos reais.

## 6.4 Testes de acessibilidade e interface

- Navegação por teclado.
- Foco em diálogos.
- Leitura de rótulos e descrições.
- Responsividade.
- Estados vazios.
- Mensagens de erro e sucesso.
- Confirmações de operações destrutivas.

## 6.5 Verificações finais obrigatórias

Executar os comandos equivalentes disponíveis no projeto:

- instalação/validação de dependências, sem atualizar versões desnecessariamente;
- lint;
- typecheck;
- testes unitários;
- testes de integração, se existirem;
- build de produção.

Registrar os comandos exatos e seus resultados. Não afirmar que um teste passou se ele não foi executado.

---

# 7. Definição de pronto por prioridade

Uma prioridade só pode ser considerada concluída quando:

1. O problema foi confirmado no código atual.
2. A causa foi identificada e explicada.
3. A implementação resolve a causa, não apenas mascara o sintoma.
4. Os critérios de aceite foram verificados.
5. Testes automatizados relevantes foram criados ou atualizados.
6. Os testes existentes continuam passando.
7. Lint, typecheck e build passam, quando disponíveis.
8. A interface foi revisada em desktop e mobile nos fluxos afetados.
9. Não houve perda de dados de teste nem regressão em funcionalidades próximas.
10. A documentação foi atualizada quando o comportamento ou as limitações mudaram.

Se algum item não puder ser concluído, classifique como **bloqueado** ou **parcial**, explique a razão e não o apresente como concluído.

---

# 8. Entregáveis exigidos do modelo executor

Ao terminar cada prioridade, produzir um relatório com este formato:

## Relatório da etapa

**Prioridade:** P0.1 / P0.2 / etc.  
**Status:** concluída / parcial / bloqueada.

**Achado confirmado:** descrição do problema observado no código atual.

**Causa raiz:** explicação técnica objetiva.

**Arquivos alterados:** lista dos caminhos e resumo da alteração em cada um.

**Decisões de implementação:** decisões relevantes e justificativas.

**Compatibilidade:** impacto sobre dados antigos, preferências existentes e comportamento anterior.

**Testes executados:** comando, cenário e resultado.

**Critérios de aceite:** marcar cada critério como atendido ou não atendido.

**Riscos e pendências:** o que ainda precisa de atenção.

**Próxima etapa recomendada:** somente a próxima prioridade prevista neste documento.

Ao concluir todo o plano, apresentar também:

- resumo executivo das melhorias;
- relação completa de arquivos alterados;
- testes executados e resultados;
- limitações que permaneceram;
- confirmação explícita de que não houve alteração de dados reais do usuário;
- eventuais mudanças de escopo aprovadas e suas justificativas.

---

# 9. O que não deve ser feito

Para evitar expansão desnecessária de escopo, não implementar nesta rodada:

- diagnóstico ou classificação clínica automatizada;
- recomendações terapêuticas;
- pontuação de saúde mental ou de desempenho;
- streaks, medalhas, rankings ou gamificação de frequência;
- inteligência artificial para interpretar os relatos pessoais;
- sincronização em nuvem;
- contas, login ou backend novo;
- notificações push sem suporte técnico real;
- redesenho completo da interface;
- novas categorias ou questionários extensos sem necessidade;
- gráficos adicionais que repitam informações existentes;
- migração tecnológica ou troca de framework;
- refatoração ampla sem relação direta com os itens priorizados.

Se identificar uma necessidade fora do escopo, documente-a como sugestão futura. Não a implemente sem autorização.

---

# 10. Sequência operacional recomendada

Execute exatamente nesta sequência, reportando ao final de cada item:

1. **P0.1 — Restauração de rascunhos.**
2. **P0.2 — Importação segura de backup.**
3. **P0.3 — Proteção do carregamento de dados de exemplo.**
4. **P1.1 — Semântica de impulso, comportamento realizado e episódio.**
5. **P1.2 — Persistência e efetividade do onboarding.**
6. **P1.3 — Decisão e implementação coerente do lembrete.**
7. **P2.1 — Visão diária consolidada.**
8. **P2.2 — Acessibilidade dos diálogos.**
9. **P2.3 — Documentação offline e avaliação/implementação de PWA.**
10. **Revisão final — regressão, documentação e relatório consolidado.**

**Instrução final:** comece pela inspeção do repositório e pela confirmação de P0.1. Não tente implementar tudo em uma única alteração. Priorize segurança dos dados, mantenha a arquitetura existente e avance somente após validar cada etapa.
