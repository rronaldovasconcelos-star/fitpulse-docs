# Acesso e papéis

## O que este login é, e o que não é

Vale dizer primeiro, porque tudo o mais depende disso.

O login **separa experiências**. Cada papel vê a sua tela, o aluno vê os dados dele, o personal
vê os alunos dele. Isso funciona e é útil.

O login **não protege nada**. Os dados e os resumos de senha ficam no `localStorage` do
navegador de quem abre o sistema. Qualquer pessoa com as ferramentas do desenvolvedor lê o
financeiro inteiro, muda o papel da própria conta para `admin` ou forja uma sessão. Não há
servidor para impedir.

Isso está escrito na tela de entrada e em Configurações, de propósito. Um cliente não pode
descobrir isso sozinho depois.

Proteção de verdade exige servidor, e está descrita em
[Trocar por um banco](08-trocar-por-banco.md).

## Um campo, três papéis

A tela de entrada tem um campo só, "CPF, e-mail ou usuário", porque o identificador é único
entre os papéis:

| papel | identificador | exemplo |
|---|---|---|
| administração | nome de usuário | `admin` |
| aluno | CPF, só dígitos | `12345678900` |
| personal parceiro | e-mail, minúsculo | `carla.nunes@personal.com` |

`normalizarIdentificador()` converte o que a pessoa digitou. CPF com ponto e traço vira só
dígitos; e-mail com maiúscula vira minúsculo. É por isso que digitar `123.456.789-00` e
`12345678900` dá no mesmo.

## A senha

Tudo o que cria, entra, troca senha ou ativa uma conta passa por `src/auth/acesso.ts`, a
interface `ServicoDeAcesso`. As telas chamam `acesso.criarAcessoDoAluno`, `acesso.definirAtiva`,
`acesso.cadastrarParceiro` e `useAuth().trocarSenha`, e não sabem qual implementação responde:
`acessoLocal.ts` no `localStorage`, ou a do Supabase Auth na nuvem. Depois de mexer numa conta,
a tela pede `recarregar(['accounts'])` ao estado, porque a escrita não passou por ele.

No modo local, `src/auth/crypto.ts` guarda o resumo SHA-256 de `salt:senha`, com salt de 16 bytes aleatórios
por conta. A senha em si nunca é gravada, nem pode ser recuperada.

Há uma implementação própria de SHA-256 no arquivo, além da nativa. Não é preciosismo:
`crypto.subtle` só existe em contexto seguro, e o servidor de desenvolvimento também atende pelo
IP da rede, onde a página é http comum. Sem a reserva, entrar pelo celular na mesma rede
quebraria. A implementação foi conferida contra a do Node em oito casos, incluindo os tamanhos
de borda do preenchimento e acento em UTF-8.

Os resumos das contas de demonstração são pré-computados e colados em `defaultData.ts`, porque
gerar hash é assíncrono e isso obrigaria a inicialização inteira a esperar. `testes/acesso.ts`
confere que cada um deles realmente bate com a senha `fitpulse123`; se alguém editar um salt sem
recalcular o hash, o teste reprova.

## Como cada papel ganha acesso

**Administração.** Nasce com a conta semeada, senha `fitpulse123` e `mustChangePassword` ligado.
O primeiro acesso obriga a trocar antes de qualquer tela aparecer.

**Aluno.** A academia gera a senha no momento da matrícula: seis dígitos, mostrados uma vez no
aviso da tela. O aluno entra com o CPF e é obrigado a trocar. Se a senha se perder, a
administração redefine pela lista de alunos.

**Personal parceiro.** Escolhe a própria senha no formulário público de cadastro. A conta nasce
com `active: false`, e tentar entrar devolve "seu cadastro está em análise". Aprovar o cadastro
é o que liga a conta.

## Quando a senha se perde

Sem servidor não há e-mail de recuperação, e o resumo não volta a ser senha. A tela de entrada
tem "Perdi o acesso", que:

- orienta aluno e personal a pedir uma senha nova na recepção, que é o caminho real;
- explica à administração que não há como recuperar, e por quê;
- oferece recomeçar do zero como último recurso, dizendo antes o que será apagado.

Isso existe porque, sem essa saída, a administração que esquece a senha fica trancada para fora
do próprio financeiro, sem nenhum caminho na tela.

## A sessão

Vive no `sessionStorage`, na chave `fitpulse_session`. Recarregar a página mantém; fechar a aba
derruba. Cada aba tem a sua, então dá para deixar administração numa e aluno em outra, o que é
útil para testar.

```ts
interface Session {
  accountId: string;
  role: Role;
  memberId?, partnerId?: string;
  displayName: string;
  startedAt: string;
}
```

## O escopo dos dados

`useMemberData(memberId)` recorta tudo o que é de um aluno: fichas, registros de treino,
medidas, fotos, lembretes e a dieta. As telas de treino, evolução, dieta e lembretes nunca
escolhem de quem é o dado; quem escolhe é quem chama o gancho.

Isso serve ao aluno olhando os próprios dados e ao personal olhando os do aluno dele, com o
mesmo componente.

E é organização de tela, não segurança: enquanto tudo estiver no navegador, os dados dos outros
alunos continuam ao alcance de quem abrir as ferramentas do desenvolvedor.

## O controle de rota

Em `src/app/Root.tsx`, nesta ordem:

```
sem sessão + rota não pública       → apresentação
mustChangePassword + fora da troca  → trocar senha
rota /entrar com sessão             → casa do papel
prefixo da rota ≠ papel da sessão   → casa do papel
```

O último é o que impede um aluno de abrir `#/admin/caixa` digitando na barra de endereço. As
rotas públicas ficam de fora dessa verificação, o que mantém a apresentação acessível mesmo com
alguém logado.

## Na nuvem: o que protege de verdade

Com `VITE_BACKEND=supabase`, o login deixa de ser só organização de tela:

- **A senha mora no Supabase Auth.** O sistema nunca a vê nem guarda resumo. Como o Auth só
  conhece e-mail, `admin` e o CPF viram um e-mail sintético determinístico
  (`<login>@acesso.fitpulse.local`, em `src/auth/identificador.ts`); o parceiro usa o e-mail
  real. Efeito: recuperação por e-mail só existe para o parceiro. Aluno e administração
  dependem da redefinição pela recepção, que já era o fluxo.
- **`accounts` é a tabela `profiles`**, 1:1 com `auth.users`: papel, login, `member_id`,
  `partner_id`, `must_change_password`, `active`. O repositório só a lê.
- **Criar ou mexer no acesso de outra pessoa exige a chave de serviço**, que nunca chega ao
  navegador. Passa pela Edge Function `acesso-admin` (criar acesso de aluno, redefinir senha,
  ativar ou desativar, apagar), que confere pelo token que quem chama é uma administração
  ativa. Desativar também bane o usuário, para o token parar de valer na hora.
- **O cadastro público do parceiro é a Edge Function `cadastrar-parceiro`**: cria o usuário
  sem e-mail de confirmação, o parceiro pendente e a conta inativa, nesta ordem. Nada usa
  `auth.signUp`, e "Enable sign ups" fica desligado no painel.
- **Quem decide o que sai do banco são as políticas de acesso por linha** em
  `supabase/migrations/0002_politicas.sql`, uma por tabela e papel: o aluno lê a própria
  matrícula e nada do caixa; o parceiro lê os alunos dele, a agenda inteira e só os lançamentos
  que lhe dizem respeito; a administração lê tudo. Funções `security definer`
  (`sou_admin()`, `meu_member_id()`, `meus_alunos_ids()`) evitam recursão em `profiles`, e um
  trigger impede o aluno de mudar as colunas financeiras da própria linha.
- **A sessão continua na aba** (`sessionStorage`), agora como token do Supabase: fechar a aba
  derruba, recarregar mantém.

`npm run conferir-rls` prova tudo isso contra o projeto real, e fica vermelho se rodar antes
das políticas. O passo a passo do painel está em [Operar o Supabase](11-supabase-operacao.md).
