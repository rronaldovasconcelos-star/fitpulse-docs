# Dados e migração

## As chaves

Dezessete chaves no `localStorage`, todas com prefixo `fitpulse_`:

```
fitpulse_accounts          fitpulse_routines
fitpulse_partners          fitpulse_workout_logs
fitpulse_schedule          fitpulse_measurements
fitpulse_members           fitpulse_photos
fitpulse_plans             fitpulse_diet_plans
fitpulse_transactions      fitpulse_reminders
fitpulse_food_db           fitpulse_ai_messages
fitpulse_settings          fitpulse_ai_config
fitpulse_schema_version
```

Mais uma no `sessionStorage`: `fitpulse_session`.

Duas chaves de versões anteriores existem só para a migração saber lê-las, e são apagadas depois
que ela roda: `fitpulse_profile` e `fitpulse_diet_plan`.

## O repositório

`src/data/repo.ts` é **o único arquivo do sistema que sabe onde os dados moram**. Nenhuma tela
toca no `localStorage`.

Duas interfaces:

```ts
interface Colecao<T extends { id: string }> {
  listar(): Promise<T[]>;
  salvar(item: T): Promise<void>;      // insere ou substitui pelo id
  remover(id: string): Promise<void>;
  substituirTudo(itens: T[]): Promise<void>;
}

interface Documento<T> {
  ler(): Promise<T>;
  gravar(valor: T): Promise<void>;
}
```

**Os métodos são assíncronos de propósito**, mesmo o `localStorage` sendo síncrono. Banco
responde por promessa, e mudar isso depois obrigaria a mexer em toda chamada do sistema. A
implementação local resolve na hora.

`lerBruto` e `gravarBruto` são as únicas funções que tocam o `localStorage`, e as duas engolem
exceção: cota estourada e navegação privada não podem derrubar a tela. Falha de gravação vai
para o console.

## Onde os dados moram é decidido no build

`src/data/ambiente.ts` lê `VITE_BACKEND`. Com `supabase`, o repositório é o da nuvem; com
qualquer outro valor, ou sem a variável, é o `localStorage`. As telas não sabem qual dos dois
está em uso.

| comando | arquivo de ambiente | backend |
|---|---|---|
| `npm run dev`, `npm run build` | nenhum | local |
| `npm run dev:nuvem`, `npm run build:nuvem` | `.env.nuvem.local` | Supabase |

O `.env.example` mostra o que o `.env.nuvem.local` precisa ter. O arquivo real é ignorado pelo
git; a chave de serviço, que só os scripts de operação usam, não tem prefixo `VITE_` e por isso
nunca entra no site.

A leitura de `import.meta.env` fica isolada nesse módulo, com guarda, porque o bundle
CommonJS dos testes não tem `import.meta` (ver [Armadilhas](10-armadilhas.md)).

## Quando a gravação falha

O estado em memória muda antes de o repositório gravar, para a tela responder na hora. Se a
gravação falhar, `AppStateProvider` mostra o aviso vermelho "Não foi possível salvar", relê do
repositório só a coleção afetada, e a tela volta a mostrar o que de fato está guardado. É a
opção mais simples das três descritas em [Trocar por um banco](08-trocar-por-banco.md): a
pessoa vê a mudança sumir, mas nunca fica achando que salvou.

Se a carga inicial falhar (banco fora, sem rede), a tela oferece "Tentar de novo" em vez de
ficar em "Carregando…" para sempre.

## A migração

`src/data/migrations.ts`, chamada em `main.tsx` antes do primeiro render.

Ela é chamada sempre, e sai na primeira linha se `fitpulse_schema_version` já estiver na versão
atual. Rodar de novo não muda nada, e isso tem teste.

### O que a versão 1 converteu

Antes, o sistema tinha um perfil solto que não era um aluno matriculado, e todo dado de treino
pertencia a ele por ser o único.

1. Acha o aluno correspondente ao perfil antigo, pelo nome. Se ninguém bate, usa o primeiro.
2. Move a ficha física do perfil para dentro daquele `Member`. Os outros alunos recebem a ficha
   padrão.
3. Carimba `memberId` em fichas, registros de treino, medidas, fotos e lembretes que não têm.
4. Converte a dieta única em lista de um item, com dono.
5. Semeia o que falta, conforme a seção seguinte.
6. Grava a versão.
7. **Só então** apaga `fitpulse_profile` e `fitpulse_diet_plan`.

A ordem de 6 e 7 importa: nada antigo é apagado antes de o novo estar gravado.

### Instalação nova contra academia em uso

Esta parte foi um defeito encontrado por teste, e vale entender.

```ts
const instalacaoNova = membrosSalvos.length === 0 && perfil === null;
```

**Instalação nova** recebe a demonstração inteira: seis alunos, treze lançamentos, dois
parceiros, agenda, fichas, medidas.

**Academia em uso** recebe só o que é estrutural: a conta da administração, sem a qual ninguém
entraria no sistema que acabou de ganhar login, mais listas vazias de parceiro e agenda.

Sem essa distinção, um navegador com dados reais receberia alunos de mentira e lançamentos de
exemplo por cima do caixa de verdade.

Os alunos que já existiam ficam sem conta até a academia definir uma senha, e a lista os mostra
como "sem acesso".

### Toda coleção é materializada

Outro defeito achado por teste: a migração antes gravava só as chaves novas. As antigas
continuavam sendo lidas dos padrões do código, sem nunca terem sido gravadas.

O efeito era sutil e ruim: os dados **pareciam** salvos, mas mudariam sozinhos na primeira
versão que mexesse nos exemplos. Agora as dezessete chaves são gravadas na primeira execução.

## Backup

Exportar, em Configurações, gera um JSON com as catorze coleções, os dois documentos e o
`schemaVersion`.

Importar passa o arquivo por `migrarBackup()` antes de aplicar, o que converte backups de
formato antigo: carimba dono nos registros, converte a dieta única em lista e remove o perfil
solto. Um backup gerado antes da versão 1 é importável.

O import é tolerante: percorre as coleções conhecidas e aplica as que forem array. Se nenhuma
for, avisa que o arquivo não serve, em vez de deixar o sistema vazio.

## Onde as fotos moram

`ProgressPhoto.imageUrl` guarda uma **referência**, e só `src/data/fotos.ts` sabe o que ela é. Três
formas convivem: URL `https:` (as fotos de demonstração), `data:` (imagem embutida, modo local) e
caminho no Storage (`<member_id>/<photo_id>.jpg`, nuvem). `ehUrlPronta` separa as duas primeiras
da terceira; `useUrlDaFoto` resolve a terceira em URL assinada na hora de exibir.

A interface `ArmazenamentoDeFotos` tem `guardar`, `urlParaExibir` e `apagar`. Antes de guardar, a
imagem é reduzida no navegador (lado maior 1600 px, JPEG 0,85): uma foto de celular tem 8 MB e
nada disso serve para comparar antes e depois. No modo local o resultado ainda precisa caber em
2,5 MB; na nuvem, o bucket aceita até 8 MB.

A tela nunca vê a imagem guardada: `EvolucaoPage` chama `fotos.guardar` e só então grava o registro
com a referência devolvida. Se o guardar falhar, o registro não é gravado e a pessoa vê o motivo.

## Limites do localStorage

Cerca de 5 MB por origem, dependendo do navegador. O que consome de verdade são as **fotos de
evolução**, que viram texto embutido: uma foto de 2 MB ocupa cerca de 2,7 MB depois de
codificada.

Por isso a foto é reduzida antes de ser guardada e, no modo local, `fotosLocal.ts` recusa o que
ainda passar de 2,5 MB. Sem esse limite, o aluno estourava a cota e o sistema parava de gravar em
silêncio. Na nuvem a foto sai do registro e vai para o Storage (seção anterior).
