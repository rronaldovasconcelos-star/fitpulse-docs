# Trocar o localStorage por um banco

Este documento era o plano. Em 14/09/2026 o plano virou código: o sistema roda nos dois modos,
`localStorage` e Supabase, escolhidos no build. O que segue é **como foi feito** e o que
ficou para depois. O passo a passo do painel está em [Operar o Supabase](11-supabase-operacao.md).

## Por que precisava

Três coisas eram verdade e nenhuma se resolvia no navegador:

1. **Os dados não passavam de um dispositivo para outro.** O aluno não abria a ficha no celular
   dele, porque ela estava no computador da recepção.
2. **O login não protegia nada.** Quem abria as ferramentas do desenvolvedor lia o financeiro,
   mudava o próprio papel para `admin` e forjava uma sessão.
3. **Limpar os dados do site apagava tudo.** Não havia cópia em lugar nenhum.

## O que segurou a troca

O sistema foi construído esperando isso, e as três apostas pagaram:

- **`src/data/repo.ts` era o único lugar que sabia onde os dados moravam.** A nuvem entrou como
  `repoSupabase.ts`, cumprindo a mesma `DataRepo`, e `repo.ts` escolhe um dos dois por
  `VITE_BACKEND`. Nenhuma tela mudou por causa disso.
- **Os métodos já eram assíncronos.** Nenhuma chamada mudou de forma.
- **O escopo por aluno já era explícito** (`useMemberData`, os filtros do parceiro). Cada um
  virou uma política de acesso por linha, quase um para um.

## As seis fases, como ficaram

### 1. Esquema — `supabase/migrations/0001_esquema.sql`

Uma tabela por coleção, colunas em snake_case, tradução mecânica em `src/data/nomesDeColuna.ts`.
Decisões que não estavam no plano e valem registrar:

- **Ids continuam `text`** (`mem-1`, `par-1726…`). Trocar por uuid obrigaria a mexer em toda
  geração de id nas telas, sem ganho.
- **Datas em `text`**, no formato que o sistema já usa. `date`/`timestamptz` mudariam a string
  na volta e quebrariam comparações que funcionam.
- **`jsonb` para o aninhado** (`profile`, `agreement`, `exercises`, `meals`). Um `Partner` ou
  uma ficha é sempre lido e gravado inteiro; dividir criaria junção sem ganho. O histórico de
  acordos do parceiro ficou para depois, como o plano previa.
- **FK só onde apagar deve propagar.** Cópias históricas (`plan_name`, `monthly_fee`,
  `member_name`) ficam sem FK, como o doc 03 já explicava.
- **`Account` virou `profiles`**, 1:1 com `auth.users`, sem senha. No sistema o tipo `Account`
  perdeu `passwordHash`/`salt`, que foram para `ContaLocal`, só do modo local.
- **`gymInfo` saiu de `ai_config` para `gym_info`**, porque a página pública precisa do
  endereço e da chave PIX, e a chave do agente não pode ir junto. O tipo `AIAgentConfig` não
  mudou: o repositório compõe as duas tabelas.
- **Parceiros aprovados para anônimo via view `parceiros_publicos`** (quatro colunas), em vez
  de privilégio por coluna, que quebra `select *`.

### 2. Repositório — `src/data/repoSupabase.ts`

`colecaoSupabase(tabela)` e `documentoSupabase(tabela)` genéricos, mais quatro casos
comentados: `accounts` (somente leitura), `partners` (mesclado com a view), `aiConfig` (duas
tabelas) e os três documentos de linha única. `substituirTudo` grava antes de apagar, e o
delete só alcança o que a política deixa ver.

Duas telas que reescreviam a coleção inteira (`LembretesPage`, `AgentePage`) passaram a gravar
por diferença, senão o aluno tentaria inserir lembretes de outros alunos e a política recusaria.

### 3. Políticas — `supabase/migrations/0002_politicas.sql`

Funções `security definer` (`sou_admin`, `meu_member_id`, `meus_alunos_ids`…) para não
recursar em `profiles`; uma política por tabela e papel; trigger `proteger_colunas` para o
aluno não mudar a própria mensalidade. A tabela completa está em
[Acesso e papéis](04-acesso-e-papeis.md). `npm run conferir-rls` prova cada linha contra o
projeto real, e ficou vermelho antes das políticas entrarem.

### 4. Tratamento de erro — `AppStateProvider`

A opção 1, como o plano recomendava: estado otimista, e se a gravação falhar, aviso vermelho e
releitura só da coleção afetada. A carga inicial que falha oferece "Tentar de novo". As opções
2 (desfazer só o item) e 3 (fila de escrita para internet ruim) continuam abertas.

### 5. Fotos — `src/data/fotos.ts`

Interface `ArmazenamentoDeFotos` com duas implementações. Na nuvem, o arquivo vai para o
bucket privado `fotos-evolucao` e `imageUrl` guarda o caminho; para exibir, vira URL assinada
por uma hora. A imagem é reduzida no navegador antes de subir (1600 px), o que também aliviou
o modo local.

### 6. Migrar quem já usava — `scripts/importar-backup-supabase.ts`

Lê o JSON exportado por Configurações, passa por `migrarBackup()`, insere tudo, cria as contas
com senha nova (as locais são descartadas) e sobe as fotos `data:` para o bucket.

## O que mudou nas telas, afinal

O plano dizia "nenhuma tela precisa mudar". Quase: as que **escreviam em `accounts`** mudaram,
porque na nuvem criar ou ativar o acesso de outra pessoa exige a chave de serviço. Elas passaram
a chamar `src/auth/acesso.ts` (a interface `ServicoDeAcesso`, com uma implementação por modo),
que na nuvem chama as Edge Functions `acesso-admin` e `cadastrar-parceiro`. Foram seis
arquivos, todos em `pages/admin` e `pages/auth`.

E a ordem dos provedores inverteu: `AuthProvider` acima de `AppStateProvider`, porque o que o
repositório devolve depende de quem pergunta.

## O que ficou para depois

- **Fila de escrita para internet ruim** (opção 3 do erro).
- **Uma única chamada de carga** (`rpc carregar_tudo()`) em vez de dezesseis `select` no
  mount. Hoje são requisições paralelas, aceitável; medir antes de mexer.
- **Histórico de acordos do parceiro** (tabela própria em vez de `jsonb`).
- **Gerador de id central** com sufixo aleatório, porque `Date.now()` colide em multiusuário.
- **Hospedar o site** e trocar a marca pela do cliente.

## Alternativa que ficou em aberto: Postgres na própria VPS

O mesmo desenho funciona com Postgres e uma API própria; a diferença é que autenticação,
políticas e armazenamento viram código seu. O `DataRepo` e o `ServicoDeAcesso` continuam sendo
a fronteira, e é isso que mantém a escolha reversível.
