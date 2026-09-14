# Testes

```bash
npm run testar
```

129 verificações em cinco arquivos. Rodam em segundos.

## Por que não há framework

Não há Vitest, Jest nem nada. `testes/rodar.mjs` empacota cada arquivo com o esbuild que já vem
junto do Vite e executa no Node.

Cinco arquivos de teste não justificam mais uma dependência, mais um arquivo de configuração e
mais uma coisa para atualizar. A função `conferir(nome, real, esperado)` tem oito linhas e
compara com `JSON.stringify`. Quando o número de testes crescer a ponto de doer, aí vale trocar.

Os testes estão no `tsconfig.json` (`include: ["src", "testes"]`), então `npm run lint` também
os checa.

## O que é testado, e por quê

A escolha não foi cobrir tudo. Foi cobrir **o que é caro de descobrir errado depois**.

### `testes/migracao.ts`, 24 verificações

A migração mexe no histórico de quem já usava o sistema. Um erro aqui apaga o treino e o caixa
de alguém, e não tem volta.

Cobre três cenários:

- **Instalação nova:** semeia a demonstração inteira, grava as dezessete chaves, e rodar de novo
  não muda nada.
- **Academia em uso:** o perfil solto vira a ficha física do aluno certo, quem não tinha recebe
  a padrão, nenhum aluno ou lançamento de exemplo entra por cima dos reais, só a administração
  ganha acesso, e as chaves antigas somem depois de tudo gravado.
- **Backup antigo importado:** ganha versão, os registros ganham dono, a dieta única vira lista.

Os dois defeitos mais sérios do projeto foram achados por esse arquivo, e não olhando a tela.

### `testes/regras.ts`, 31 verificações

O acerto do parceiro vira dinheiro no caixa sem ninguém conferir a conta. A agenda decide o que
a academia deixa marcar.

Cobre o cálculo por percentual e por aluguel fixo, o sentido do dinheiro em cada um, o
arredondamento em centavos, o bloqueio de lançar o mesmo mês duas vezes, o parceiro sem acordo,
e todos os casos de conflito de agenda, incluindo os que devem **não** conflitar: encostar sem
sobrepor, outra área no mesmo horário, e editar o próprio horário.

### `testes/acesso.ts`, 37 verificações

Os resumos de senha das contas de demonstração são pré-computados e colados no código. Se
alguém editar um salt sem recalcular o hash, ninguém entra e a causa é invisível.

Confere que os seis resumos batem com a senha, que cada acesso entra (CPF com e sem pontuação,
e-mail com maiúscula), que parceiro pendente é recusado com o motivo certo, e que trocar a senha
invalida a anterior. Depois, o mesmo ciclo pela interface `ServicoDeAcesso` do modo local:
entrar, restaurar a sessão da aba, trocar a senha de quem está na sessão, sair, e a conta que sai
para as telas não carrega o resumo da senha. E os dois caminhos que criam conta: o cadastro público
do parceiro (nasce pendente, é barrado como "em análise", e-mail repetido é recusado) e o acesso do
aluno criado pela administração (troca obrigatória, entra pelo CPF, CPF repetido é recusado).

### `testes/nomes.ts`, 12 verificações

O nome curto do exercício no trilho do treino ao vivo. Roda contra os 32 nomes que existem no
sistema e reprova qualquer um que fique vazio, termine em preposição ou passe do tamanho do
botão.

Existe porque o corte anterior produzia "Crucifixo no" e "Desenvolvimento com" na tela.

### `testes/supabase.ts`, 25 verificações

As duas traduções que ficam entre o sistema e o banco: nome de coluna (`monthlyFee` ↔
`monthly_fee`, em `src/data/nomesDeColuna.ts`) e identificador de acesso (`admin` e CPF viram
e-mail sintético, em `src/auth/identificador.ts`). São puras e não precisam de rede.

Confere a ida e volta de um aluno, de um parceiro com acordo, de uma dieta com refeições e de
uma ficha com exercícios (os objetos aninhados atravessam intactos), que `undefined` vira `null`
na ida e `null` some na volta, que `created_at` é descartado, e que sem variável de ambiente o
backend é o local — o que prova que `import.meta` não derruba o bundle dos testes. E que
`ehUrlPronta` distingue URL pronta (`https:`, `data:`) de caminho no armazenamento de fotos, e que a
cópia do identificador nas Edge Functions usa o mesmo domínio sintético do sistema.

## O que não é testado

Componente React. Não há biblioteca de teste de componente, e a verificação de tela é feita à
mão, no navegador.

Isso é uma escolha consciente, mas é dívida. Se o projeto crescer, os primeiros a merecer teste
de componente são o `Modal`, por causa da prisão de foco, e o `ActiveWorkoutModal`, porque o
timer de descanso tem estado que é fácil de quebrar sem perceber.

## O truque do espaço não separável

Uma armadilha que já custou tempo. O formatador de moeda do JavaScript separa o "R$" do valor
com espaço **não separável** (U+00A0), e não com espaço comum.

Comparar uma descrição formatada contra um texto escrito à mão falha por um caractere
invisível. O teste normaliza:

```ts
lancamento.description.replace(/ /g, ' ')
```

## Verificação manual

O que os testes não cobrem, e precisa ser passado à mão antes de entregar:

1. Abrir com `localStorage` de versão antiga e conferir que nada some.
2. Login da administração obrigando a trocar a senha.
3. Matricular aluno, ver a senha gerada, entrar com ela.
4. Criar ficha, executar o treino, conferir que o descanso toca e que o registro aparece na
   evolução.
5. Cadastro público de parceiro, recusa por estar em análise, aprovação, e o acesso funcionando.
6. Parceiro montando ficha para aluno vinculado, e o aluno vendo a ficha marcada e sem editar.
7. Agenda com horário sobreposto sendo bloqueada.
8. Acerto batendo com o percentual, e lançar duas vezes sendo impedido.

Os itens 5 a 8 nunca foram verificados na tela: o navegador travou durante a sessão em que
seriam testados. A lógica dos quatro tem teste automatizado, mas ninguém olhou.
