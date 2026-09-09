# Testes

```bash
npm run testar
```

90 verificações em quatro arquivos. Rodam em segundos.

## Por que não há framework

Não há Vitest, Jest nem nada. `testes/rodar.mjs` empacota cada arquivo com o esbuild que já vem
junto do Vite e executa no Node.

Quatro arquivos de teste não justificam mais uma dependência, mais um arquivo de configuração e
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

### `testes/acesso.ts`, 23 verificações

Os resumos de senha das contas de demonstração são pré-computados e colados no código. Se
alguém editar um salt sem recalcular o hash, ninguém entra e a causa é invisível.

Confere que os seis resumos batem com a senha, que cada acesso entra (CPF com e sem pontuação,
e-mail com maiúscula), que parceiro pendente é recusado com o motivo certo, e que trocar a senha
invalida a anterior.

### `testes/nomes.ts`, 12 verificações

O nome curto do exercício no trilho do treino ao vivo. Roda contra os 32 nomes que existem no
sistema e reprova qualquer um que fique vazio, termine em preposição ou passe do tamanho do
botão.

Existe porque o corte anterior produzia "Crucifixo no" e "Desenvolvimento com" na tela.

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
