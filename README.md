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

## Para quem vai continuar

O maior débito é o backend, e está descrito em
[Trocar por um banco](docs/08-trocar-por-banco.md). Enquanto ele não existir, três coisas são
verdade e precisam ser ditas a qualquer cliente: os dados não passam de um dispositivo para
outro, o login não protege nada de quem abrir as ferramentas do navegador, e limpar os dados do
site apaga o sistema inteiro.
