# Visão geral

## De onde veio

O FitPulse começou como um aplicativo exportado do Google AI Studio, em setembro de 2026. O
export rodava e parecia completo, mas trazia problemas que não aparecem usando o aplicativo:

- `@types/react` não estava instalado. Sem ele o TypeScript não valida JSX nenhum, então o
  `npm run lint` passava sem checar nada. Instalar os tipos e ligar `strict` revelou 3119 erros
  de uma vez, quase todos do mesmo sintoma.
- Sete dependências declaradas e nunca importadas, incluindo uma biblioteca de modelo de
  linguagem e um servidor web, num aplicativo sem servidor e sem modelo nenhum.
- Um perfil de usuário solto ("Lucas Silva") que não era um aluno matriculado. Todo treino,
  medida e lembrete pertencia a ele por ser o único.
- Telas prometendo o que o código não fazia: um "Concierge Inteligente" que era um `if/else` por
  palavra-chave, e um recibo com selo de "autenticação digital", QR falso e hash aleatório.

O sistema foi reconstruído em cima disso, mantendo o que funcionava (o fluxo de treino, os
cálculos de dieta, a síntese de som) e trocando o resto.

## O que o sistema faz

### Aluno

Abre e vê **qual é o treino de hoje**, que é a ficha parada há mais tempo. Isso reproduz a
rotação ABC sem pedir que ninguém configure calendário.

Toca em começar e entra no **treino ao vivo**, a única tela do sistema usada de pé, no meio da
academia. Carga e repetições aparecem em 56 pixels, os botões de ajuste têm 48 pixels de altura,
e o descanso corre preso no topo com bipe nos três últimos segundos.

Fora isso: evolução com peso, medidas e comparação de fotos; dieta com metas calculadas a partir
do próprio corpo; lembretes que disparam aviso do navegador.

### Administração

O painel abre com **o que precisa de ação hoje**: quem está atrasado, quem vence nos próximos
cinco dias, quem pediu cadastro de personal. Os números do mês vêm depois, porque informam sem
pedir nada.

Fora isso: matrículas com geração de senha do aluno, caixa com entradas e saídas, planos,
parceiros, agenda da academia e configurações.

### Personal parceiro

Pede cadastro por um formulário público, na própria tela de entrada. Fica pendente até a
administração aprovar e definir o acerto. Depois disso vê os alunos vinculados a ele, monta as
fichas deles, marca os horários em que atende na academia e acompanha quanto tem a receber ou a
pagar no mês.

## O que o sistema deliberadamente não faz

Vale registrar, porque cada uma dessas ausências foi uma decisão e não um esquecimento.

**Não tem inteligência artificial.** A tela de atendimento responde por palavra-chave, com os
dados reais da matrícula, e diz isso no alto da própria tela. Existe um campo para apontar um
serviço externo, e aí sim as respostas passam a vir de lá.

**Não emite documento fiscal.** O recibo é comprovante de recebimento para controle interno, e o
rodapé dele diz exatamente isso.

**Não tem carrinho nem vitrine.** A página de apresentação mostra os planos, mas a matrícula é
feita na recepção. É um sistema de gestão, não uma loja.

**Não protege dados.** O login separa o que cada papel vê, e só. Ver
[Acesso e papéis](04-acesso-e-papeis.md).

## Como rodar

Requer Node.js 20 ou superior.

```bash
git clone https://github.com/rronaldovasconcelos-star/fitpulse.git
cd fitpulse
npm install
npm run dev      # http://localhost:3000
```

| comando | o que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento na porta 3000 |
| `npm run lint` | checagem de tipos, precisa ficar limpa |
| `npm run testar` | 90 verificações da migração, das regras e do acesso |
| `npm run build` | gera `dist/`, arquivos estáticos |

Acessos de demonstração, senha `fitpulse123` em todos:

| papel | identificador |
|---|---|
| administração | `admin`, com troca obrigatória no primeiro acesso |
| aluno | `123.456.789-00` |
| personal parceiro | `carla.nunes@personal.com` |

## Nomes em português

Código, comentários, commits e nomes de variável estão em português do Brasil. Os tipos herdados
do export original mantiveram os nomes em inglês (`Member`, `WorkoutRoutine`) para não misturar
uma renomeação em massa com as mudanças de comportamento. Onde código novo foi escrito, tudo é
português.

Se for renomear os tipos algum dia, faça num commit isolado, sem nenhuma outra mudança junto.
