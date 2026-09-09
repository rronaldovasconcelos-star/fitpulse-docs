# Sistema visual

## De onde vem a paleta

O export original era preto neutro com um verde ácido, e esse verde aparecia em 330 lugares
sendo marca, ação, sucesso, "pago" e cor de gráfico ao mesmo tempo. Uma cor que significa cinco
coisas não significa nenhuma.

A paleta atual vem da própria sala de musculação: o piso de borracha, o giz, e as cores das
anilhas olímpicas, que já são um código de cor que qualquer pessoa que treina reconhece.

```css
--color-borracha:    #1c1b19   /* fundo, grafite quente e não preto azulado */
--color-borracha-2:  #26241f   /* superfície elevada */
--color-borracha-3:  #34312a   /* botão neutro, barra de progresso vazia */
--color-linha:       #423e35   /* borda e divisória */

--color-giz:         #f2eee6   /* texto principal */
--color-giz-fraco:   #a8a29a   /* texto secundário */
--color-giz-apagado: #78736b   /* nota de rodapé */

--color-anilha-15:   #e9b62a   /* amarelo: ÚNICA cor de ação */
--color-anilha-10:   #2e9e5b   /* verde: pago, concluído, aprovado */
--color-anilha-25:   #d8362a   /* vermelho: atrasado, erro, recusado */
--color-anilha-20:   #2f6fd6   /* azul: pendente, informação */
```

A regra que faz isso funcionar: **o amarelo é ação, e nada mais**. Verde, vermelho e azul só
carregam estado, nunca decoração. Um botão amarelo numa tela é o que a pessoa veio fazer ali.

Os tokens vivem no `@theme` do Tailwind 4, em `src/index.css`. Não há arquivo de configuração
do Tailwind: a versão 4 lê os tokens do próprio CSS.

## Tipografia

Duas famílias, com trabalhos que não se misturam:

- **Big Shoulders Display** (700 a 900): número grande, título, letra da ficha, countdown do
  descanso. É condensada, de sinalização, e ocupa pouca largura no celular.
- **Barlow** (400 a 700): corpo e interface, com `tabular-nums` em tabela e placar.

A escala tem nomes em vez de tamanhos:

| token | tamanho | uso |
|---|---|---|
| `text-nota` | 12px | rodapé de tabela, legenda |
| `text-corpo` | 14px | corpo, o menor tamanho da interface |
| `text-campo` | 16px | formulário |
| `text-titulo` | 22px | título de bloco |
| `text-cabeca` | 32px | título de página |
| `text-numero` | 56px | carga da série, countdown |
| `text-letra` | 96px | letra do treino no topo |

Nada abaixo de 14px na interface. O sistema é usado de pé, com o celular a um braço de
distância, e o export original tinha praticamente tudo em 12px.

O `font-mono` que aparecia 89 vezes foi trocado por `tabular-nums`, que alinha os dígitos sem
mudar a família.

## Os componentes

`src/components/ui/`. Antes não existia nenhum, e cada tela repetia a mesma string de classes.

| componente | o que resolve |
|---|---|
| `Button` | cinco tons, três tamanhos. `IconButton` **exige** rótulo textual |
| `Entrada`, `Senha`, `Selecao`, `Area` | campo com rótulo, auxílio e erro ligados por `aria-describedby` |
| `Interruptor` | liga e desliga com `role="switch"` e `aria-checked` de verdade |
| `Modal` | fecha no ESC e no clique fora, prende o foco, devolve o foco a quem abriu |
| `Secao` | título com régua, e contagem opcional |
| `Selo` | estado com as cores de anilha, mais os mapeadores por domínio |
| `Vazio` | tela vazia com convite e ação, em vez de uma linha cinza |
| `Placar` | número grande com unidade, rótulo e variação |

Três decisões dentro deles valem menção.

**`IconButton` exige rótulo.** É um componente separado de `Button` justamente para que o
TypeScript não deixe passar um botão só de ícone sem nome. O export original tinha cerca de
trinta desses, invisíveis para leitor de tela.

**`Senha` tem o olho.** Foi acrescentado depois que uma senha correta foi recusada e não havia
como descobrir o porquê: o navegador tinha autopreenchido outra coisa. Senha escondida sem jeito
de conferir é uma armadilha, ainda mais num formulário onde o campo de cima é o CPF.

**`Placar` tem prefixo e unidade separados.** Em português o "R$" vem antes do número e o "kg"
depois. Um campo só de unidade produzia "519,90 R$".

## Acessibilidade

O export original tinha zero `aria-*`, zero `role`, zero `focus-visible` e `focus:outline-none`
em 77 lugares. O que existe hoje:

- **Foco sempre visível.** Anel amarelo de 2px em `:focus-visible`, definido na base do CSS.
  Nenhum componente remove.
- **Alvo de 44px** em telas de dedo, por uma regra `@media (pointer: coarse)`.
- **Movimento respeitado.** `prefers-reduced-motion` corta toda animação, e o gancho que faz os
  blocos surgirem na página de apresentação já entrega tudo visível quando essa preferência está
  ligada.
- **Toda imagem tem texto alternativo**, e o do gráfico de fotos descreve a data.

## Movimento

Uma classe de surgimento (`fp-surgir`) e uma de pulso (`fp-pulso`), e só.

O pulso é usado num lugar: o countdown do descanso, nos três últimos segundos. É o único momento
em que a tela precisa chamar atenção de longe.

Não há transição de hover em card, nem fade por seção ao rolar, que são o padrão de página
gerada.

## A página de apresentação

`src/pages/publico/ApresentacaoPage.tsx` é a única tela com fotografia, e ela usa a mesma
identidade do resto: os mesmos tokens, a mesma tipografia. A foto entra como matéria-prima, e
não como decoração em cima de um layout que existiria sem ela.

O conteúdo vem do sistema: planos, personais aprovados, endereço, horário e chave PIX saem do
que a administração cadastrou. Mudar o preço de um plano muda a página.

As fotos ficam em `public/fotos/`, baixadas e não linkadas. O `CREDITOS.md` de lá explica por
quê e guarda o critério de escolha para quando o cliente trocar pelas dele.
