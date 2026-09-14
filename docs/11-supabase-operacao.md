# Operar o Supabase

O que precisa ser feito à mão no painel e na linha de comando para o FitPulse rodar na nuvem,
na ordem. Tudo o que é código está no repositório do sistema, em `supabase/` e `scripts/`.

## O que vive onde

| coisa | onde | quem usa |
|---|---|---|
| `supabase/migrations/0001_esquema.sql` | tabelas, view, índices, RLS ligada | CLI ou SQL Editor |
| `supabase/migrations/0002_politicas.sql` | funções auxiliares, triggers, políticas | idem |
| `supabase/migrations/0003_storage.sql` | bucket `fotos-evolucao` e políticas | idem |
| `supabase/functions/acesso-admin` | criar acesso de aluno, redefinir senha, ativar, apagar | a administração, pelo sistema |
| `supabase/functions/cadastrar-parceiro` | cadastro público do parceiro | qualquer visitante, pelo sistema |
| `scripts/semear-supabase.ts` | demonstração inteira, com os seis acessos | quem opera |
| `scripts/conferir-rls.ts` | prova as políticas contra o projeto real | quem opera, antes e depois do 0002 |
| `scripts/importar-backup-supabase.ts` | sobe um backup do modo local | quem opera, uma vez por academia |
| `scripts/redefinir-senha-admin.ts` | senha nova para a administração | quem opera, quando ela se perde |

## 1. Criar o projeto

No painel do Supabase, **New project**, região **South America (São Paulo)**. Guarde a senha
do banco no cofre; o sistema não a usa, mas a CLI e o backup usam.

Em **Project Settings → API**, copie três coisas para `.env.nuvem.local` na raiz do sistema
(modelo em `.env.example`):

```
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

A chave de serviço ignora toda política e cria usuários. Ela **não tem prefixo `VITE_`** de
propósito: o Vite só embute no site o que começa com `VITE_`, então ela nunca chega ao
navegador. Só os scripts de `scripts/` a leem. O arquivo é ignorado pelo git; o caminho dele
vai para o `SECRETS.local.md` do projeto, nunca o valor.

## 2. Fechar a porta do cadastro

**Authentication → Providers → Email**: desligar **Enable sign ups**. Toda criação de usuário
passa pela chave de serviço nas Edge Functions, com `email_confirm: true`, então a confirmação
por e-mail nem entra em cena. Com o sign up aberto, qualquer pessoa criaria um usuário sem
perfil.

**Authentication → Settings**: deixar **Secure password change** desligado. O sistema
reautentica com a senha atual antes de trocar; ligar isso exigiria um segundo passo que a tela
não tem.

## 3. Aplicar as migrations

Com a CLI:

```powershell
winget install Supabase.CLI        # uma vez por PC; NÃO instale pelo npm neste projeto
supabase login
supabase link --project-ref <ref>  # dentro da pasta do sistema
supabase db push                   # aplica 0001, 0002 e 0003 na ordem
```

**Não instale a CLI pelo npm** neste projeto: o pacote `supabase` cria um atalho em
`node_modules/.bin`, e é exatamente o atalho que o `&` no nome da pasta quebra no Windows.
Pelo winget ela vale para qualquer pasta.

Sem a CLI: **SQL Editor** no painel, colar o conteúdo de cada arquivo e rodar, na ordem
0001, 0002, 0003. É mais lento, e o histórico de migrations do projeto não fica registrado,
mas funciona.

Para ver o vermelho antes do verde (o que prova que o teste testa), aplique só o 0001, rode
`npm run semear` e `npm run conferir-rls`: quase tudo falha, porque a RLS está ligada e não
há política. Depois aplique 0002 e 0003 e rode de novo.

## 4. Publicar as funções

```powershell
supabase functions deploy acesso-admin
supabase functions deploy cadastrar-parceiro
```

Se reclamar de Docker, acrescente `--use-api`. As variáveis `SUPABASE_URL`,
`SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem dentro das funções; nada a
configurar.

Sem a CLI: **Edge Functions → Deploy a new function** no painel, colar o `index.ts` de cada
uma e o conteúdo de `_shared/` como arquivos extras.

## 5. Semear e conferir

```powershell
npm run semear                   # recusa se já houver alunos
npm run semear -- --substituir   # apaga tudo, inclusive usuários, e semeia de novo
npm run conferir-rls             # tem de sair "Políticas conferidas, sem falhas."
```

O `semear` cria os mesmos seis acessos do modo local, com a senha `fitpulse123`, e imprime a
tabela. Em **Authentication → Users** aparecem seis usuários; os de aluno e administração têm
e-mail `<login>@acesso.fitpulse.local`, que ninguém recebe (ver [Acesso](04-acesso-e-papeis.md)).

## 6. Rodar o sistema contra a nuvem

```bash
npm run dev:nuvem      # http://localhost:3000, lendo .env.nuvem.local
npm run build:nuvem    # arquivos estáticos para hospedar
```

`npm run dev` e `npm run build` continuam no modo local, sem ler arquivo nenhum.

## Quando a senha da administração se perde

Na nuvem não há "recomeçar do zero" pela tela. Dois caminhos:

```powershell
npm run redefinir-senha-admin -- <senha nova>
```

ou, no painel, **Authentication → Users → `admin@acesso.fitpulse.local` → ⋯ → Reset
password** (definir a senha diretamente; enviar e-mail não serve, o endereço não existe).
Nos dois casos a próxima entrada obriga a trocar.

## Subir uma academia que já usava o modo local

1. Na versão local, **Configurações → Exportar backup**.
2. `npm run importar-backup -- caminho\do\backup.json` (com `--substituir` se o projeto já
   tiver dados).
3. As senhas do backup são descartadas: o resumo local não serve ao Supabase. Todo mundo
   recebe senha nova, impressa no console, com troca obrigatória no primeiro acesso.
4. Fotos em `data:` sobem para o bucket; as `https:` ficam.

## Custos e limites

- O plano gratuito **pausa o projeto após 7 dias sem uso**, e o site fica fora até alguém
  religar no painel. Para cliente real, o plano Pro (US$ 25/mês) evita isso e dá backup diário.
- 500 MB de banco e 1 GB de Storage no gratuito. Uma foto reduzida pesa 100 a 300 KB; dá para
  milhares antes de doer.
- Token de sessão vale 1 h e renova sozinho enquanto a aba está aberta. Desativar uma conta
  (`definir_ativa`) também bane o usuário, para o token parar de valer na hora.

## Conferência rápida de que a proteção existe

Com `npm run dev:nuvem` aberto e um aluno logado, no console do navegador:

```js
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
// use a URL e a chave anônima do .env.nuvem.local
const s = createClient('https://<ref>.supabase.co', '<anon key>', { auth: { storage: sessionStorage } });
(await s.from('transactions').select('*')).data   // → []
(await s.from('members').select('id')).data       // → só o próprio
```

Se vier mais do que isso, uma política está errada. `npm run conferir-rls` diz qual.
