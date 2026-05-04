# VPS Terminal Cheatsheet

## Entrar na VPS

```bash
ssh ubuntu@104.234.41.50
```

Se no futuro voce configurar alias no `~/.ssh/config`, o comando pode virar algo como:

```bash
ssh catalogo-vps
```

## Limpar a tela

```bash
clear
```

Atalho equivalente:

```text
Ctrl + L
```

## Entrar na pasta do app

```bash
cd /var/www/catalogos-api-lab/app
```

## Salvar output grande em arquivo

Use este formato quando o comando gerar muita saida:

```bash
SEU_COMANDO > /tmp/log.txt 2>&1
```

Exemplo:

```bash
npm run build > /tmp/build.log 2>&1
```

Isso salva:

- a saida normal
- os erros

no mesmo arquivo.

## Ver so o final do output salvo

```bash
tail -40 /tmp/build.log
```

## Ver o output inteiro salvo

```bash
cat /tmp/build.log
```

## Ver o output em partes

Primeiras 120 linhas:

```bash
sed -n '1,120p' /tmp/build.log
```

Proximas 120 linhas:

```bash
sed -n '121,240p' /tmp/build.log
```

Isso e melhor do que copiar um terminal gigante.

## Procurar texto sem imprimir uma muralha de codigo

Mostrar so o nome dos arquivos que contem um texto:

```bash
grep -R -l "texto" .next
```

Exemplo:

```bash
grep -R -l "Politica da sincronizacao" .next
```

## Salvar resultado de `grep` em arquivo

```bash
grep -R -l "Politica da sincronizacao" .next > /tmp/politica.log 2>&1
```

## Reiniciar o app com as envs do `.env`

Quando alterar variaveis no `.env`, especialmente da Varejonline:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/restart-platon-pm2-with-env.sh
```

## Deploy completo na VPS

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```
