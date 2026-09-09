# Trocar o localStorage por um banco

O maior débito do projeto. Este documento é o plano.

## Por que precisa

Três coisas são verdade hoje e nenhuma delas se resolve no navegador:

1. **Os dados não passam de um dispositivo para outro.** O aluno não abre a ficha no celular
   dele, porque ela está no computador da recepção. Isso sozinho já impede o produto de ser o
   que promete.
2. **O login não protege nada.** Quem abre as ferramentas do desenvolvedor lê o financeiro,
   muda o próprio papel para `admin` e forja uma sessão.
3. **Limpar os dados do site apaga tudo.** Não há cópia em lugar nenhum, além do backup manual
   que alguém precisa lembrar de gerar.

## O que já está pronto para a troca

O sistema foi construído esperando isso.

**A camada de dados está isolada.** `src/data/repo.ts` é o único arquivo que sabe onde os dados
moram. As telas chamam `salvar`, `remover` e `substituir` no estado global, que chama o
repositório.

**Os métodos já são assíncronos.** Nenhuma chamada precisa mudar de forma.

**O escopo por aluno já está explícito.** `useMemberData(memberId)` filtra tudo o que é de um
aluno. Esses filtros viram políticas de acesso por linha no banco, quase um para um.

## O caminho recomendado: Supabase

Autenticação pronta, Postgres, políticas de acesso por linha e armazenamento de arquivo para as
fotos. Gratuito para começar, e o sistema continua sendo arquivos estáticos.

### Fase 1, o esquema

Uma tabela por coleção, com os mesmos nomes de campo dos tipos em `src/types.ts`. Duas mudanças:

- `Account` deixa de existir como tabela. Vira `auth.users` do Supabase mais uma tabela
  `profiles` com `role`, `member_id`, `partner_id` e `must_change_password`.
- Os campos que hoje são cópia (`Member.planName`, `Member.monthlyFee`) continuam cópia. É
  proposital: o histórico não pode mudar quando alguém edita um plano.

O `PartnerAgreement`, que hoje vive dentro do parceiro, pode virar coluna `jsonb` ou tabela
própria. Tabela própria abre espaço para histórico de acordos, que hoje não existe.

### Fase 2, o repositório novo

Escrever `criarRepoSupabase()` cumprindo a mesma interface `DataRepo`. É o trabalho mais
mecânico da migração:

```ts
function colecaoSupabase<T extends { id: string }>(tabela: string): Colecao<T> {
  return {
    async listar() {
      const { data, error } = await supabase.from(tabela).select('*');
      if (error) throw error;
      return data as T[];
    },
    async salvar(item) {
      const { error } = await supabase.from(tabela).upsert(item);
      if (error) throw error;
    },
    // remover, substituirTudo
  };
}
```

Trocar `export const repo = criarRepoLocal()` por uma escolha via variável de ambiente permite
rodar os dois lados durante a transição.

### Fase 3, as políticas de acesso

É aqui que o sistema ganha segurança de verdade. Cada filtro que hoje está no cliente vira
política no banco:

| hoje, no cliente | vira, no banco |
|---|---|
| `useMemberData` filtra por `memberId` | aluno lê apenas linhas onde `member_id` é o dele |
| parceiro vê os alunos com `partnerId` dele | parceiro lê alunos onde `partner_id` é o dele |
| `RoleGate` bloqueia rota de outro papel | administração é a única com acesso a `transactions` |

A regra de ouro: **o filtro no cliente continua existindo, para a tela**, mas quem decide o que
sai do banco é a política.

### Fase 4, o tratamento de erro

Este é o ponto que exige decisão de projeto, e não só código.

Hoje `AppStateProvider` atualiza o estado em memória primeiro e grava depois. Com banco, a
gravação pode falhar por rede, e a tela já mostrou o resultado.

Três opções, em ordem de esforço:

1. **Recarregar em caso de falha.** Simples, e a pessoa vê a mudança sumir. Aceitável para
   começar.
2. **Desfazer só o item que falhou** e avisar. Mais trabalho, resultado melhor.
3. **Fila de escrita com repetição**, para funcionar mal conectado. É o certo para uma academia
   com internet ruim, e é bem mais caro.

Comece pela primeira, mas escreva o `avisar` de erro desde o início.

### Fase 5, as fotos

`ProgressPhoto.imageUrl` hoje é a imagem inteira embutida em texto, e é o que mais consome cota.
Vira o Storage do Supabase, com o campo guardando a URL.

Isso permite tirar o limite de 2,5 MB e melhorar a qualidade das fotos de evolução.

### Fase 6, migrar quem já usava

Se alguma academia já estiver rodando a versão local, precisa de um caminho de subida:

1. Exportar o backup pela tela de Configurações.
2. Uma rotina que lê esse JSON e insere no banco, criando as contas de acesso.
3. As senhas locais são descartadas, porque o resumo local não serve ao Supabase. Todo mundo
   recebe senha nova.

## O que não muda

Vale dizer, porque é o ponto da arquitetura: **nenhuma tela precisa mudar**. As páginas, os
shells, os componentes e as regras de negócio continuam iguais. O trabalho está no repositório,
nas políticas e no tratamento de erro.

## Alternativa: Postgres na própria VPS

Se a preferência for não depender do Supabase, o mesmo desenho funciona com Postgres e uma API
própria. A diferença é que autenticação, políticas de acesso e armazenamento de arquivo passam a
ser trabalho seu, o que é bastante código antes de qualquer funcionalidade nova aparecer.

O `DataRepo` continua sendo a fronteira, e é isso que mantém a escolha em aberto.
