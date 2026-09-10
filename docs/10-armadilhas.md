# Armadilhas

O que já quebrou, e o que morde quem chega agora. Cada item aqui custou tempo de alguém.

## O `npm run lint` pode passar sem checar nada

`@types/react` não estava instalado no projeto que veio do AI Studio. Sem ele, o TypeScript não
tem a definição de JSX e trata todo elemento como `any`. O `tsc --noEmit` retornava zero, e não
checava nada.

Instalar os tipos e ligar `strict` revelou 3119 erros de uma vez, quase todos do mesmo sintoma.

**Se algum dia o lint passar suspeitosamente rápido**, confira que `@types/react` e
`@types/react-dom` estão em `devDependencies`.

## O `&` no nome da pasta quebra o npx

A pasta do projeto se chama `fitpulse---academia,-treino-&-dieta`. O `&` faz o `npx` e os
atalhos de `node_modules/.bin` falharem no Windows com uma mensagem que não ajuda:

```
'-dieta\node_modules\.bin\' não é reconhecido como um comando interno
```

Rodar as ferramentas direto pelo node contorna:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/vite/bin/vite.js build
```

Renomear a pasta resolveria de vez, mas quebra o caminho registrado na memória do projeto.

## `crypto.subtle` não existe fora de contexto seguro

O servidor de desenvolvimento roda com `--host 0.0.0.0`, então dá para abrir pelo IP da rede e
testar no celular. Nesse endereço a página é http comum, e `crypto.subtle` é `undefined`.

Sem tratamento, o login quebraria exatamente no cenário em que mais se quer testar. Por isso
`src/auth/crypto.ts` tem uma implementação própria de SHA-256 como reserva.

Ela foi conferida contra a do Node em oito casos, incluindo os tamanhos de borda do
preenchimento (55, 56 e 64 bytes) e acento em UTF-8.

## A gravação no localStorage falha em silêncio

Cota estourada, navegação privada e navegador com dados de site bloqueados fazem `setItem`
lançar exceção. `gravarBruto` engole e loga, porque derrubar a tela seria pior.

O efeito colateral: **uma gravação pode falhar sem ninguém perceber**. O maior consumidor de
cota são as fotos de evolução, que viram texto embutido, e por isso o `ModalFoto` recusa imagem
acima de 2,5 MB.

Se um cliente relatar "salvei e sumiu", olhe a cota primeiro.

## O acento na busca do atendimento

`src/components/AIAgentTab.tsx` normaliza a pergunta com `normalize('NFD')` e remove as marcas
de acento com uma expressão regular que contém **caracteres literais de combinação**, invisíveis
no editor:

```ts
const ACENTOS = /[̀-ͯ]/g;   // é isso que está lá, escrito com os caracteres reais
```

Um editor que "limpe" caracteres invisíveis pode quebrar isso sem deixar rastro. Se "horário"
parar de achar o assunto de horários, é aqui.

## O espaço não separável da moeda

`toLocaleString('pt-BR', { style: 'currency' })` separa o "R$" do valor com U+00A0, não com
espaço comum. Comparar contra texto escrito à mão falha por um caractere que não se vê.

Já custou uma falha de teste que parecia impossível, com as duas strings idênticas na tela.

## Editar `ManagementTab` não existe mais

O arquivo de 1396 linhas foi dividido em `pages/admin/`. Se você encontrar referência a
`ManagementTab`, `Navbar`, `ProfileModal`, `WorkoutsTab` ou `App.tsx`, é documentação velha: os
cinco foram removidos.

## O treino ao vivo não fecha ao navegar

`ActiveWorkoutModal` é um overlay de tela cheia, e não uma rota. Mudar o endereço na barra não o
fecha, porque ele cobre a navegação inteira e a pessoa não teria como chegar lá.

É aceitável hoje, mas se um dia o treino virar rota própria, lembre que o estado dele é uma
cópia de trabalho: sair sem finalizar descarta o que foi marcado, e isso é intencional.

## O sentido do dinheiro no acerto

Repetindo o que está em [Regras de negócio](05-regras-de-negocio.md), porque é o item mais
provável de estar errado:

Por percentual a academia paga o parceiro (despesa). Por aluguel fixo o parceiro paga a academia
(receita). **Isso nunca foi confirmado com uma academia real.** Se estiver invertido, o caixa
fica errado em silêncio, porque as duas leituras produzem lançamentos plausíveis.

## Os hashes de senha são colados no código

`defaultData.ts` guarda os resumos SHA-256 das contas de demonstração, pré-computados. Editar um
salt sem recalcular o hash faz aquela conta parar de entrar, com a mensagem "senha incorreta" e
nenhuma pista da causa.

`testes/acesso.ts` pega isso. Rode `npm run testar` depois de mexer em qualquer conta de exemplo.

## O Chrome pode travar em sessão longa

Não é do projeto, mas atrapalhou a verificação: numa sessão de automação longa, o Chrome parou
de renderizar qualquer aba nova e passou a recusar acesso ao `localStorage` com `SecurityError`.
O servidor respondia normalmente por `curl`.

Se acontecer, feche o navegador inteiro em vez de abrir mais abas.

## O `&` no caminho da pasta quebra os scripts do npm

Os scripts do `package.json` chamam os executáveis por `node` e caminho completo
(`node node_modules/vite/bin/vite.js`) em vez de pelo nome curto (`vite`). Não é enfeite.

O npm no Windows executa o script pelo `cmd.exe`, colocando `node_modules\.bin` no `PATH`. Se o
caminho do projeto tiver `&`, o `cmd` parte a linha ali e trata o resto como um segundo comando.
A pasta em que o projeto nasceu, exportada do AI Studio, se chama
`fitpulse---academia,-treino-&-dieta`, e com o nome curto o erro era este, sem citar o `&`:

```
'-dieta\node_modules\.bin\' não é reconhecido como um comando interno ou externo
Error: Cannot find module 'C:\Users\franc\Desktop\vite\bin\vite.js'
```

Quatro dos cinco comandos documentados falhavam assim: `dev`, `build`, `preview` e `lint`. Só
`testar` funcionava, porque já chamava `node` direto — foi o que deu a pista.

Chamar por `node` resolve para qualquer caminho, e não só para este. Se algum dia um script novo
for escrito com o nome curto, ele vai falhar só na máquina de quem tiver caractere especial no
caminho, o que é o pior tipo de defeito.

## A senha `fitpulse123` do `admin` só vale enquanto ninguém a trocar

O primeiro acesso da administração obriga a trocar a senha. Depois disso o navegador guarda o
salt e o hash novos, e `fitpulse123` deixa de entrar — inclusive numa sessão de teste meses
depois, quando ninguém lembra qual senha foi escolhida.

Como não há servidor, não há recuperação: o "Perdi o acesso" **recomeça o sistema** e leva junto
alunos, caixa e parceiros cadastrados no teste.

Para voltar a entrar sem perder os dados, dá para devolver à conta `acc-admin` o par de
demonstração, no console do navegador:

```js
const contas = JSON.parse(localStorage.getItem('fitpulse_accounts'));
const adm = contas.find((a) => a.id === 'acc-admin');
adm.salt = '7f3a1c9e5b2d8046';
adm.passwordHash = '13a262e1a026d2176dd56c756e9754fdf85e0666fcd78aaedf054372e343ee0a';
adm.mustChangePassword = false;
localStorage.setItem('fitpulse_accounts', JSON.stringify(contas));
location.reload(); // sem recarregar, o aplicativo segue com as contas antigas em memória
```

Os dois valores são os mesmos de `INITIAL_ACCOUNTS` em `src/data/defaultData.ts`. O `reload` é
parte da receita: as contas são lidas na abertura, e trocar só o `localStorage` não basta.
