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

## Limites do localStorage

Cerca de 5 MB por origem, dependendo do navegador. O que consome de verdade são as **fotos de
evolução**, que viram texto embutido: uma foto de 2 MB ocupa cerca de 2,7 MB depois de
codificada.

Por isso `ModalFoto` recusa imagem acima de 2,5 MB. Sem esse limite, o aluno estourava a cota e
o sistema parava de gravar em silêncio.

Foto é o primeiro candidato a sair para armazenamento de verdade quando houver backend.
