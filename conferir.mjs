/**
 * Confere os números que a documentação afirma contra o código do FitPulse.
 *
 * Existe porque texto envelhece em silêncio: dizer "90 verificações" quando são
 * 94 não quebra nada, e ninguém percebe até confiar no número errado.
 *
 *   node conferir.mjs [caminho-do-fitpulse]
 *
 * Sem argumento, procura o sistema na pasta irmã.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const AQUI = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const CANDIDATOS = [
  process.argv[2],
  join(AQUI, '..', 'fitpulse---academia,-treino-&-dieta'),
  join(AQUI, '..', 'fitpulse'),
].filter(Boolean);

const sistema = CANDIDATOS.map((c) => resolve(c)).find((c) => existsSync(join(c, 'src', 'types.ts')));

if (!sistema) {
  console.error('Não achei o FitPulse. Passe o caminho:\n  node conferir.mjs ../fitpulse');
  process.exit(2);
}

console.log(`Sistema: ${sistema}\n`);

const ler = (...partes) => readFileSync(join(sistema, ...partes), 'utf8');
const contar = (texto, padrao) => (texto.match(padrao) ?? []).length;

/** Roda os testes do sistema e conta quantas verificações passaram. */
function verificacoesQuePassam() {
  try {
    const saida = execFileSync(process.execPath, [join(sistema, 'testes', 'rodar.mjs')], {
      cwd: sistema,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return contar(saida, /^ok\b/gm);
  } catch (erro) {
    // Teste que falha ainda deixa contar o que passou antes.
    const saida = String(erro.stdout ?? '');
    console.log('  aviso: algum teste falhou, veja com npm run testar\n');
    return contar(saida, /^ok\b/gm);
  }
}

const tipos = ler('src', 'types.ts');
const repo = ler('src', 'data', 'repo.ts');

const medidas = [
  {
    o_que: 'chaves ativas no localStorage',
    valor: contar(repo.split('CHAVES_ANTIGAS')[0], /fitpulse_[a-z_]+'/g),
    onde: 'docs/07-dados-e-migracao.md',
  },
  {
    o_que: 'tipos exportados em types.ts',
    valor: contar(tipos, /^export (interface|type) /gm),
    onde: 'docs/03-modelo-de-dados.md',
  },
  {
    o_que: 'verificações que passam',
    valor: verificacoesQuePassam(),
    onde: 'docs/09-testes.md e README.md',
  },
  {
    o_que: 'arquivos de teste',
    valor: readdirSync(join(sistema, 'testes')).filter((f) => f.endsWith('.ts')).length,
    onde: 'docs/09-testes.md',
  },
  {
    o_que: 'componentes em components/ui',
    valor: readdirSync(join(sistema, 'src', 'components', 'ui')).filter((f) => f.endsWith('.tsx'))
      .length,
    onde: 'docs/06-sistema-visual.md',
  },
  {
    o_que: 'fotos em public/fotos',
    valor: readdirSync(join(sistema, 'public', 'fotos')).filter((f) => f.endsWith('.jpg')).length,
    onde: 'docs/06-sistema-visual.md',
  },
];

console.log('Números de hoje:\n');
for (const m of medidas) {
  console.log(`  ${String(m.valor).padStart(4)}  ${m.o_que.padEnd(34)} ${m.onde}`);
}

// Procura no texto da documentação números que não batem mais.
console.log('\nProcurando números desatualizados no texto:\n');
const docs = readdirSync(join(AQUI, 'docs'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ['docs/' + f, readFileSync(join(AQUI, 'docs', f), 'utf8')]);
docs.push(['README.md', readFileSync(join(AQUI, 'README.md'), 'utf8')]);

const alvos = [
  { rotulo: 'verificações', certo: medidas[2].valor, padrao: /(\d+)\s+verificaç/gi },
  { rotulo: 'tipos exportados', certo: medidas[1].valor, padrao: /(\d+)\s+tipos exportados/gi },
  { rotulo: 'chaves', certo: medidas[0].valor, padrao: /(\d+|dezessete)\s+chaves/gi },
];

const porExtenso = { dezessete: 17, dezesseis: 16, dezoito: 18 };
let divergencias = 0;

for (const [arquivo, texto] of docs) {
  const linhas = texto.split('\n');
  for (const alvo of alvos) {
    for (const [i, linha] of linhas.entries()) {
      // A contagem por arquivo de teste é legítima e não precisa bater com o
      // total: "24 verificações" do migracao.ts é parte das 90.
      if (/testes\/\w+\.ts/.test(linha)) continue;

      for (const achado of linha.matchAll(alvo.padrao)) {
        const cru = achado[1].toLowerCase();
        const numero = porExtenso[cru] ?? Number(cru);
        if (Number.isFinite(numero) && numero !== alvo.certo) {
          divergencias++;
          console.log(`  ${arquivo}:${i + 1} diz "${achado[0].trim()}", mas são ${alvo.certo}`);
        }
      }
    }
  }
}

if (divergencias === 0) console.log('  Nada divergente.');

console.log(
  divergencias === 0
    ? '\nA documentação bate com o código.'
    : `\n${divergencias} número(s) para corrigir.`
);
process.exit(divergencias === 0 ? 0 : 1);
