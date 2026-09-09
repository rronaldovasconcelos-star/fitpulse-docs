# ESTADO — fitpulse-docs

> Este arquivo é o handoff. Qualquer PC (ou qualquer sessão do Claude) retoma o
> trabalho lendo daqui.
> Atualizar ao fim de cada sessão de trabalho.

**Criado em:** 2026-09-09
**Repositório:** https://github.com/rronaldovasconcelos-star/fitpulse-docs
**Pasta local (neste PC):** C:\Users\franc\Desktop\fitpulse-docs

---

## O que é

Documentação técnica do FitPulse, para quem for mexer no código. O sistema em si fica em
[rronaldovasconcelos-star/fitpulse](https://github.com/rronaldovasconcelos-star/fitpulse).

São dois repositórios de propósito: o `ESTADO.md` de lá conta onde o trabalho parou, e é curto
por isso. Aqui cabe o que não cabe num handoff, e o texto sobrevive a mudanças de código.

## Onde paramos

**09/09/2026.** Dez documentos escritos, cobrindo o sistema inteiro.

| documento | assunto |
|---|---|
| `01-visao-geral` | de onde veio, o que faz, o que deliberadamente não faz |
| `02-arquitetura` | camadas, fluxo de um dado, por que não há roteador de biblioteca |
| `03-modelo-de-dados` | os trinta tipos e como se ligam |
| `04-acesso-e-papeis` | login, senha, sessão e os limites honestos disso |
| `05-regras-de-negocio` | acerto, agenda, treino do dia, cálculos de corpo |
| `06-sistema-visual` | paleta, tipografia, componentes, acessibilidade |
| `07-dados-e-migracao` | as dezessete chaves, o repositório, a migração |
| `08-trocar-por-banco` | o plano em seis fases para tirar do navegador |
| `09-testes` | as 90 verificações e por que só elas |
| `10-armadilhas` | o que já quebrou e o que morde quem chega |

## Regra de trabalho

**Mudança de comportamento no FitPulse passa por aqui, no mesmo trabalho.** Pedido dele em
09/09/2026. A tabela do que atualizar em cada caso está no `README.md`.

Ao terminar, rodar `node conferir.mjs`, que confere os números do texto contra o código.

## O que falta

1. **Diagramas de verdade.** Os desenhos são em texto, o que basta para ler no GitHub mas fica
   pobre para apresentar a alguém.
2. **Manual do usuário.** Foi decidido que este repositório é técnico. Se a academia cliente
   precisar de manual, é outro documento, outro tom e provavelmente outro repositório.

## Decisões que não são óbvias

- **Documentação separada do código.** Assim ela pode ser compartilhada sem dar acesso ao
  repositório do sistema, e o `ESTADO.md` de lá continua curto.
- **O tom é de quem conta, não de quem lista.** Cada seção explica por que a decisão foi tomada,
  e não só o que ela é. Uma lista de campos qualquer um extrai do `types.ts`; o que não se extrai
  é o motivo.
- **As armadilhas têm documento próprio.** É a página que mais economiza tempo de quem chega, e
  enterrá-la dentro de outra seção reduziria a chance de alguém ler.
