# Modelo de dados

Tudo em `src/types.ts`. Trinta tipos exportados.

## O desenho em uma figura

```
                        Account
                     (role, login)
                    ╱             ╲
            memberId               partnerId
                ╱                       ╲
            Member ──── partnerId ────► Partner
              │                            │
              │ memberId                   │ partnerId
              ▼                            ▼
    WorkoutRoutine                   ScheduleSlot
    CompletedWorkoutLog              PartnerAgreement (dentro de Partner)
    BodyMeasurement
    ProgressPhoto
    ReminderNotification
    DietPlan
              │
              │ memberId
              ▼
    FinancialTransaction ──── partnerId ────► Partner
```

A regra que organiza tudo: **todo dado de treino pertence a um aluno**, pelo campo `memberId`.
Antes da reconstrução isso não existia, porque só havia um usuário.

## Quem é quem

### `Member`, a matrícula

É a entidade central. Um aluno é sempre um matriculado; não existe perfil solto.

```ts
interface Member {
  id: string;
  name: string;
  profile: MemberFitnessProfile;   // idade, altura, peso, objetivo
  partnerId?: string;              // personal responsável, se houver
  accountId?: string;              // acesso, ausente até a academia definir senha
  cpf, email, phone: string;
  planId, planName: string;
  status: 'ativo' | 'inadimplente' | 'pendente' | 'cancelado';
  startDate, nextDueDate: string;  // AAAA-MM-DD
  paymentMethod: 'pix' | 'cartao_credito' | 'boleto' | 'dinheiro';
  monthlyFee: number;
  emergencyContact?, notes?: string;
}
```

Duas coisas a notar. O `planName` e o `monthlyFee` são cópias do plano, não referências: se o
preço do plano mudar, `PlanosPage` percorre os alunos daquele plano e atualiza cada um. Isso é
proposital, porque o histórico não pode mudar retroativamente quando alguém edita um plano.

O `accountId` ser opcional é o que permite a academia cadastrar um aluno sem dar acesso na hora.
A lista mostra esses como "sem acesso".

### `MemberFitnessProfile` e `UserProfile`

`MemberFitnessProfile` é a ficha física: idade, sexo, altura, peso atual, peso alvo, objetivo e
nível de atividade. Vive dentro do `Member`.

`UserProfile` sobreviveu como um tipo derivado, só porque as calculadoras herdadas esperam o
nome junto:

```ts
type UserProfile = MemberFitnessProfile & { name: string };
```

A função `profileFromMember(member)` faz a conversão. Se um dia as calculadoras forem
reescritas, `UserProfile` pode sumir.

### `Account` e `Session`

```ts
interface Account {
  id: string;
  role: 'admin' | 'aluno' | 'parceiro';
  login: string;          // admin: nome de usuário; aluno: CPF só dígitos; parceiro: e-mail
  passwordHash: string;   // SHA-256 de `salt:senha`
  salt: string;
  memberId?, partnerId?: string;
  mustChangePassword: boolean;
  active: boolean;        // parceiro pendente ou recusado tem conta inativa
  createdAt: string;
}
```

O `login` é único entre todos os papéis. É por isso que a tela de entrada tem um campo só, em
vez de pedir que a pessoa escolha se é aluno ou personal.

`Session` vive no `sessionStorage`, não no `localStorage`: recarregar a página mantém, fechar a
aba derruba. É o comportamento que se espera de um computador de balcão compartilhado.

### `Partner` e `PartnerAgreement`

```ts
interface Partner {
  id: string;
  name, cref, phone, email, bio, availability: string;
  specialties: string[];
  status: 'pendente' | 'aprovado' | 'recusado' | 'inativo';
  requestedAt: string;
  reviewedAt?, reviewNotes?: string;
  agreement?: PartnerAgreement;
}

interface PartnerAgreement {
  type: 'aluguel_fixo' | 'percentual';
  fixedRent?: number;   // reais por mês, quando aluguel fixo
  percent?: number;     // 0 a 100, quando percentual
  startDate: string;
  notes?: string;
}
```

O acordo mora dentro do parceiro porque é um para um. Se um dia houver histórico de acordos, ele
vira coleção com `partnerId`.

O `status` e o `active` da conta andam juntos, mas são coisas diferentes: `status` é o estado do
cadastro, e `active` é se a conta entra. Aprovar um parceiro muda os dois.

### `ScheduleSlot`, o horário na academia

```ts
interface ScheduleSlot {
  id: string;
  partnerId: string;
  dayOfWeek: number;      // 0 é domingo
  startTime, endTime: string;   // "07:00"
  memberId?: string;      // aluno atendido, opcional
  area: 'musculacao' | 'funcional' | 'cardio' | 'outro';
  notes?: string;
}
```

É recorrente semanal, não uma data. Uma academia marca "toda segunda às sete", e não "dia 14".
Se um dia precisar de exceção, entra um campo de datas puladas, e não um registro por semana.

### `FinancialTransaction`, o caixa

```ts
interface FinancialTransaction {
  id: string;
  type: 'receita' | 'despesa';
  category: 'mensalidade' | 'matricula' | 'personal' | 'suplemento' | 'aluguel'
          | 'salarios' | 'manutencao' | 'equipamentos' | 'servicos' | 'outros';
  description: string;
  amount: number;
  date: string;           // AAAA-MM-DD
  status: 'pago' | 'pendente' | 'atrasado';
  paymentMethod: ...;
  memberId?, memberName?: string;
  partnerId?, partnerName?: string;
  period?: string;        // AAAA-MM, só nos repasses de parceiro
}
```

O repasse do parceiro **não é uma entidade própria**. É um lançamento de categoria `personal`
com `partnerId` e `period` preenchidos. Isso evita mais uma coleção e faz o repasse aparecer no
caixa como qualquer outro dinheiro, que é onde ele precisa estar.

O `period` é o que impede lançar o mesmo repasse duas vezes: antes de lançar, o sistema procura
um lançamento com o mesmo `partnerId` e `period`.

### `WorkoutRoutine` e o que pende dela

```ts
interface WorkoutRoutine {
  id: string;
  memberId: string;
  createdByPartnerId?: string;   // marca a ficha montada pelo personal
  letter?: string;               // "A", "B", "C"
  name, description: string;
  muscleFocus: MuscleGroup[];
  exercises: Exercise[];         // cada um com sets: ExerciseSet[]
  estimatedMinutes: number;
  lastDoneDate?: string;
}
```

Os exercícios e as séries vivem dentro da ficha, e não em coleções separadas. Uma ficha é sempre
lida e salva inteira, então dividir só criaria junção sem ganho.

O `createdByPartnerId` é o que faz a ficha aparecer para o aluno marcada como "montada por seu
personal", e sem os botões de editar e apagar. Ele executa, mas não altera o que outra pessoa
montou.

### `DietPlan`

Virou uma coleção com `memberId`. Antes era um objeto único, porque só havia um usuário. Quando
o aluno ainda não tem plano, `useMemberData` devolve um plano padrão calculado a partir do corpo
dele, sem gravar nada até ele mexer.

## Tipos que sobraram

`ActiveTab` ainda está exportado em `src/types.ts` e não é mais usado por ninguém: era a
navegação por aba antes do roteador. Pode ser removido no primeiro commit de limpeza.
