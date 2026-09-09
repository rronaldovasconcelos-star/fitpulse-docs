# FitPulse, documentação técnica

Como o sistema é por dentro, para quem precisa mexer nele.

O código vive em outro repositório:
[rronaldovasconcelos-star/fitpulse](https://github.com/rronaldovasconcelos-star/fitpulse).
Lá o `ESTADO.md` conta onde o trabalho parou; aqui está o que não cabe num arquivo de handoff.

## Por onde começar

Se você nunca viu o projeto, leia nesta ordem. São umas duas horas até conseguir mexer com
alguma segurança.

| documento | o que responde |
|---|---|
| [Visão geral](docs/01-visao-geral.md) | o que o sistema faz, para quem, e o que ele deliberadamente não faz |
| [Arquitetura](docs/02-arquitetura.md) | as camadas, por onde um dado entra e sai, e por que está assim |
| [Modelo de dados](docs/03-modelo-de-dados.md) | cada tipo, o que guarda e como se liga aos outros |
| [Acesso e papéis](docs/04-acesso-e-papeis.md) | login, senha, sessão, e os limites honestos disso tudo |
| [Regras de negócio](docs/05-regras-de-negocio.md) | acerto do parceiro, conflito de agenda, treino do dia |
| [Sistema visual](docs/06-sistema-visual.md) | cores, tipografia, componentes e as decisões por trás |
| [Dados e migração](docs/07-dados-e-migracao.md) | como o `localStorage` é usado e como versões antigas são convertidas |
| [Trocar por um banco](docs/08-trocar-por-banco.md) | o passo a passo para tirar o sistema do navegador |
| [Testes](docs/09-testes.md) | o que é testado, por que só isso, e como rodar |
| [Armadilhas](docs/10-armadilhas.md) | o que já quebrou, e o que morde quem chega agora |

## Resumo de uma tela

O FitPulse é um sistema de academia com três acessos separados. O **aluno** vê a ficha do dia,
executa o treino com timer de descanso, acompanha a evolução e a dieta. A **administração** cuida
de matrículas, caixa, planos, parceiros e agenda. O **personal parceiro** pede cadastro e, depois
de aprovado, monta as fichas dos alunos dele, marca horário na academia e acompanha o acerto do
mês.

React 19, Vite 6, Tailwind 4, TypeScript com `strict` ligado, Recharts para os gráficos. Sem
backend: tudo vive no `localStorage` do navegador, e a camada de acesso a dados está isolada em
um arquivo só para que essa troca seja possível sem reescrever as telas.

```
cerca de 13 mil linhas entre src/ e testes/
90 verificações automatizadas, sem framework de teste
zero erro de tipo com strict ligado
```

## Manter isto vivo

**Mudança de comportamento no sistema passa por aqui, no mesmo trabalho.** Não depois, não
quando sobrar tempo. Documentação que descreve o sistema de ontem é pior que documentação
nenhuma, porque alguém confia nela e decide errado.

Antes de fechar um trabalho no FitPulse, veja o que mudou:

| se mexeu em | atualize |
|---|---|
| tipo, campo ou relação em `types.ts` | [Modelo de dados](docs/03-modelo-de-dados.md) |
| login, senha, sessão, papel, rota protegida | [Acesso e papéis](docs/04-acesso-e-papeis.md) |
| acerto, agenda, treino do dia, cálculo de corpo | [Regras de negócio](docs/05-regras-de-negocio.md) |
| token de cor, tipografia, componente de `ui/` | [Sistema visual](docs/06-sistema-visual.md) |
| chave do `localStorage`, repositório, migração | [Dados e migração](docs/07-dados-e-migracao.md) |
| teste novo, ou a contagem de verificações | [Testes](docs/09-testes.md) |
| camada, pasta, decisão de estrutura | [Arquitetura](docs/02-arquitetura.md) |
| qualquer coisa que já mordeu alguém | [Armadilhas](docs/10-armadilhas.md) |

Mexer só no visual de uma tela, sem mudar comportamento, não exige documento novo.

**Os números aqui são conferidos contra o código, não estimados.** Há um script para isso:

```bash
node conferir.mjs            # procura o FitPulse na pasta irmã
node conferir.mjs ../outro   # ou aponte o caminho
```

Ele lê o código, conta chaves, tipos, verificações que passam, componentes e fotos, e depois
procura no texto desta documentação número que não bate mais. Sai com código 1 quando acha algo,
então serve em automação. Na primeira vez que rodou já pegou uma contagem de tipos que tinha
envelhecido no mesmo dia.

## Para quem vai continuar

O maior débito é o backend, e está descrito em
[Trocar por um banco](docs/08-trocar-por-banco.md). Enquanto ele não existir, três coisas são
verdade e precisam ser ditas a qualquer cliente: os dados não passam de um dispositivo para
outro, o login não protege nada de quem abrir as ferramentas do navegador, e limpar os dados do
site apaga o sistema inteiro.
