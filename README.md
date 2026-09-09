# fitpulse-docs

Documentacao tecnica do FitPulse: arquitetura, modelo de dados e como trocar o localStorage por banco

---

## Retomar o trabalho

Leia **[ESTADO.md](ESTADO.md)** primeiro — é o handoff: onde paramos, qual o
próximo passo, quais decisões já foram tomadas e onde ficam os segredos.

## Em outro PC

```powershell
gh repo clone rronaldovasconcelos-star/fitpulse-docs
```

Ou, para trazer todos os projetos de uma vez, rode o `retomar.ps1` que vem junto
com a memória (`.../memory/ferramentas/retomar.ps1`).

## Regras deste repositório

- **Nenhum segredo versionado.** O repositório guarda o *caminho* do segredo,
  nunca o valor. O `.gitignore` bloqueia `.env`, `*.local.*`, `.secrets/`, chaves
  e certificados; uma varredura automática recusa o commit se algo escapar.
- **Sincronização automática.** O marcador `.orbit-sync` na raiz autoriza o hook
  do Claude Code a comitar e enviar o trabalho ao fim de cada sessão. Apague o
  marcador para desligar.

