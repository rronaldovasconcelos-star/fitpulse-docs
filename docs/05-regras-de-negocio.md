# Regras de negócio

As três decisões que o sistema toma sozinho e que ninguém revisa depois. As duas primeiras têm
teste em `testes/regras.ts`.

## Acerto do personal parceiro

`src/features/partners/settlement.ts`

Dois formatos de acordo, e eles **correm em direções opostas no caixa**. Essa é a parte que
morde quem chega agora:

| acordo | quem paga | no caixa |
|---|---|---|
| `percentual` | a academia paga o parceiro | **despesa** |
| `aluguel_fixo` | o parceiro paga a academia | **receita** |

> **A confirmar com o dono.** Foi implementado assim por ser o arranjo mais comum, mas nunca foi
> confirmado com uma academia real. Se estiver invertido, é trocar o `direction` em
> `computeSettlement` e o `type` em `lancamentoDoAcerto`.

### O cálculo

Por percentual, a base é o que **foi pago de fato**, e não o que era esperado:

```ts
baseAmount = soma das mensalidades onde
  type === 'receita'
  && category === 'mensalidade'
  && status === 'pago'
  && memberId pertence a um aluno vinculado ao parceiro
  && date começa com o período (AAAA-MM)

amount = arredonda(baseAmount × percent / 100, 2 casas)
```

O `expectedAmount` soma as mensalidades dos alunos **ativos** vinculados, e aparece na tela ao
lado do realizado. Quando os dois divergem, é porque alguém não pagou, e a tela avisa isso em
português: "nem todas as mensalidades dos seus alunos entraram neste mês".

Por aluguel fixo, o valor é o combinado, independente do movimento.

### Lançar duas vezes

`lancamentoDoAcerto` monta um `FinancialTransaction` com `partnerId` e `period` preenchidos, e
`status: 'pendente'` — a baixa é feita no caixa como qualquer outro lançamento.

Antes de lançar, `computeSettlement` procura um lançamento com o mesmo `partnerId` e `period`, e
devolve o id em `existingTransactionId`. A tela usa isso para trocar o botão por uma frase
dizendo que o mês já foi lançado.

### Arredondamento

`Math.round(x * 100) / 100`. Sem isso, 30% de R$ 279,80 daria 83,939999999999 e apareceria
assim no lançamento.

## Conflito de agenda

`src/features/schedule/conflicts.ts`

Dois pesos, porque são coisas diferentes:

**Bloqueia,** porque é fisicamente impossível:
- o mesmo parceiro em dois horários que se sobrepõem;
- o mesmo aluno em duas aulas que se sobrepõem.

**Só avisa,** porque é decisão de quem conhece a sala:
- a mesma área com mais parceiros do que `settings.slotCapacity` naquela faixa.

A sobreposição usa o teste clássico, no mesmo dia da semana:

```ts
a.inicio < b.fim && b.inicio < a.fim
```

Encostar não é sobrepor: um horário que termina às 08:00 e outro que começa às 08:00 convivem.

Editar o próprio horário não conflita consigo mesmo, porque `findConflicts` descarta o registro
de mesmo `id`.

### Validação do intervalo

`intervaloInvalido` roda antes, e recusa fim antes do início e intervalo menor que quinze
minutos.

## O treino de hoje

`src/pages/student/TreinoPage.tsx`, função `escolherDeHoje`.

O sistema não pergunta que dia é o treino A. Ele mostra **a ficha parada há mais tempo**, o que
reproduz a rotação ABC na prática:

1. Descarta as fichas já feitas hoje.
2. Se sobrou alguma, ordena por `lastDoneDate` e pega a mais antiga.
3. Se todas foram feitas hoje, ordena todas e pega a mais antiga mesmo assim.

Ficha nunca executada tem `lastDoneDate` indefinido e vale como tempo zero, então entra na
frente. É o comportamento certo: uma ficha nova é a que a pessoa ainda não fez.

## Cálculos de corpo e dieta

`src/utils/storage.ts`. Vieram do export original e foram mantidos, porque são fórmulas
conhecidas e estavam corretas.

- **Índice de massa corporal:** peso dividido pela altura ao quadrado, com faixas em 18,5, 25 e
  30.
- **Gasto em repouso:** fórmula de Mifflin-St Jeor.
- **Gasto diário:** o de repouso multiplicado por 1,2 a 1,9 conforme o nível de atividade.
- **Meta de calorias:** o gasto diário menos 450 para emagrecer, mais 350 para ganhar massa.
- **Proteína:** 2,0 gramas por quilo, ou 2,2 no déficit.
- **Gordura:** 0,85 grama por quilo. O que sobra de caloria vira carboidrato.
- **Água:** 40 mililitros por quilo.

Nenhuma dessas contas é conselho médico, e o sistema não finge que é. São as fórmulas que uma
academia usa na avaliação inicial.

## Nome curto do exercício

`src/components/ActiveWorkoutModal.tsx`, funções `nomeCurto` e `nomesDoTrilho`.

O trilho de exercícios do treino ao vivo precisa de nomes curtos. Cortar por número de palavras
parava no meio da ideia: "Elevação Lateral com Halteres" virava "Elevação Lateral com".

O corte é no complemento: o que vem antes de "com", "no", "na", "de", "do", "da", "em", "para".
E o que estiver entre parênteses ou depois de barra sai fora.

Quando dois exercícios da mesma ficha ficariam com o mesmo nome curto, como "Crucifixo no
Cross" e "Crucifixo na Polia", os dois voltam ao nome completo. Encurtar só vale enquanto ainda
distingue.

`testes/nomes.ts` roda contra os 32 nomes que existem no sistema e reprova qualquer um que fique
vazio, termine em preposição ou passe de 26 caracteres.
