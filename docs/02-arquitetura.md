# Arquitetura

## As camadas

De cima para baixo, cada uma só conhece a de baixo.

```
                        main.tsx
                           │
                    migrarDados()          ← roda antes do primeiro render, só no modo local
                           │
                    AuthProvider           ← sessão de quem está usando (serviço de acesso)
                           │
                 AppStateProvider          ← estado em memória + escrita no repo
                           │
                        Root               ← decide o que mostrar
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   páginas públicas   StudentShell     AdminShell / PartnerShell
   (apresentação,          │                  │
    login, cadastro)   páginas do aluno   páginas do papel
                           │                  │
                           └────── features ──┘   ← regras puras, sem React
                                      │
                          repo.ts    acesso.ts   ← únicos lugares que sabem onde o dado e a conta moram
                                      │
                          localStorage  ou  Supabase   (VITE_BACKEND)
```

## Por onde um dado entra e sai

Um exemplo concreto, dar baixa numa mensalidade:

1. `PainelPage` chama `salvar('members', membroAtualizado)` e
   `salvar('transactions', lancamento)`.
2. `AppStateProvider` atualiza o estado em memória na hora, então a tela responde sem espera.
3. O mesmo provedor chama `repo.members.salvar(...)`, que é assíncrono.
4. `repo` grava no `localStorage`, na chave `fitpulse_members`.

A ordem importa: o estado muda primeiro e a gravação vem depois. Se a gravação falhar, por cota
estourada, navegação privada ou rede fora, o provedor mostra o aviso vermelho "Não foi possível
salvar" e relê do repositório só a coleção afetada, para a tela voltar ao que está guardado.

A sessão vem antes dos dados: `AuthProvider` fica acima do `AppStateProvider`, que só lê o
repositório depois de saber quem está usando e relê a cada troca de pessoa. No `localStorage`
isso não muda nada; na nuvem, o que o repositório devolve depende de quem pergunta.

Contas não passam pelo repositório para serem escritas. Criar acesso, redefinir senha, ativar e
cadastrar parceiro passam por `src/auth/acesso.ts`, a interface `ServicoDeAcesso`, com uma
implementação por modo. Na nuvem, essas operações exigem a chave de serviço e viram Edge
Functions; no local, é o `authService` de sempre por trás.

## As pastas

| pasta | o que vive lá |
|---|---|
| `src/app/` | estado global, sessão, roteador e o `Root` que decide a tela |
| `src/auth/` | resumo de senha e o serviço de entrada |
| `src/data/` | dados de exemplo, migração de versão e o repositório |
| `src/features/` | regras isoladas, sem React onde possível |
| `src/shells/` | a moldura de cada papel: navegação e o que é comum às páginas dele |
| `src/pages/` | uma pasta por papel, mais `auth/` e `publico/` |
| `src/components/` | componentes de tela grandes, e o sistema visual em `ui/` |
| `src/utils/` | cálculo de corpo e nutrição, síntese de som |
| `testes/` | verificações que rodam fora do navegador |

## O estado global

`src/app/AppStateProvider.tsx` guarda catorze coleções e dois documentos. Antes existiam treze
pares de `useState` mais `useEffect` no `App.tsx`, e as telas recebiam treze propriedades cada.

A interface que ele expõe é pequena de propósito:

```ts
salvar(colecao, item)        // insere ou substitui pelo id
remover(colecao, id)
substituir(colecao, itens)   // troca a lista inteira
gravarSettings(valor)
gravarAiConfig(valor)
recarregar()                 // relê tudo do repo, usado depois de importar backup
avisar(titulo, mensagem, erro?)
```

Não há `dispatch` nem redutor. Cada tela chama a ação que precisa, e a coleção é escolhida por
uma chave com tipo, então `salvar('membros', ...)` não compila.

## Os shells

Cada papel tem uma moldura. O que muda entre elas:

**`StudentShell`** carrega o agendador de lembretes e o modal de treino ao vivo. O agendador
vive aqui e não no topo do sistema porque lembrete é do aluno: quem está na recepção não deve
receber o aviso de beber água de quem está treinando.

**`AdminShell`** separa o que se faz todo dia, que vai para a barra, do que se ajusta de vez em
quando, que vai para o menu do canto. Sem essa separação, oito itens não caberiam na barra do
celular.

**`PartnerShell`** recusa a entrada se a conta não estiver ligada a um cadastro de parceiro.

Os três usam o mesmo `ShellNav`, que no computador é uma barra no topo e no celular vira uma
barra embaixo, ao alcance do polegar.

## As features

São o lugar das regras que não são de tela. Duas delas são funções puras, e é por isso que têm
teste:

- `features/partners/settlement.ts` calcula o acerto do parceiro e monta o lançamento.
- `features/schedule/conflicts.ts` decide o que a agenda bloqueia e o que só avisa.
- `features/members/useMemberData.ts` recorta os dados de um aluno. É um gancho porque lê do
  contexto, mas não decide nada.
- `features/workouts/FichaEditor.tsx` e `features/schedule/WeekGrid.tsx` são componentes usados
  por mais de um papel.

## Por que não há roteador de biblioteca

O roteamento é feito à mão em `src/app/router.ts`, umas sessenta linhas, usando o hash da URL.

Duas razões. Primeiro, o sistema é servido como arquivo estático e pode acabar hospedado sem
reescrita de rota no servidor; com hash, `#/admin/caixa` funciona em qualquer lugar, inclusive
aberto direto do disco. Segundo, não há rota aninhada nem parâmetro na URL: o que existe são
dezoito caminhos fixos.

Toda navegação passa por `navegar()`, nunca por `location.hash` direto. Isso é o que torna a
troca por uma biblioteca uma mudança de um arquivo só, se um dia fizer falta.

## O controle de acesso

`src/app/Root.tsx` roda três verificações antes de qualquer página aparecer, nesta ordem:

1. Sem sessão e fora de uma rota pública, vai para a apresentação.
2. Com senha provisória, vai para a troca de senha e não sai de lá.
3. Numa área de outro papel, volta para a casa do próprio papel.

As rotas públicas são a apresentação, o login e o cadastro de parceiro. A apresentação continua
acessível mesmo com alguém logado, de propósito, para o dono mostrar a academia sem precisar
sair da conta.
