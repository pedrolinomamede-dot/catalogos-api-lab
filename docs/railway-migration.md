# Migração VPS Platon → Railway

## O que está em risco (e o que não está)

| O que | Onde está | Risco na migração |
|---|---|---|
| Código | GitHub | seguro, não muda |
| Banco de dados | Supabase | seguro, independente da VPS |
| Imagens | Supabase Storage | seguro, independente da VPS |
| `.env` da VPS | Só na VPS | **copiar antes de cancelar** |
| App rodando | VPS | fica fora ao cancelar a VPS |

---

## Ponto de restauração no código

Tag criada antes da migração: `pre-railway-migration`

Para voltar a este ponto exato a qualquer momento:

```bash
git checkout pre-railway-migration
```

---

## Antes de qualquer coisa: copiar o .env da VPS

Rode na VPS e guarde o resultado em lugar seguro (Notion, 1Password, etc.):

```bash
cat /var/www/catalogos-api-lab/app/.env
```

Esse arquivo contém todas as chaves de API, credenciais do banco e secrets.
É o que você vai precisar para configurar o Railway ou para reativar a VPS.

---

## Configurar Railway

### 1. Criar projeto

- Acesse railway.app → Login with GitHub
- New Project → Deploy from GitHub repo → selecionar `catalogos-api-lab`
- Railway detecta o `Dockerfile` automaticamente

### 2. Variáveis de ambiente

No painel do projeto, em **Variables**, adicionar todas as vars do `.env` da VPS.
As mais críticas:

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=           domínio Railway provisório ou customizado
PUBLIC_BASE_URL=        mesmo valor que NEXTAUTH_URL
INTERNAL_BASE_URL=      http://localhost:3000
PDF_RENDER_BASE_URL=    http://localhost:3000
VAREJONLINE_CLIENT_ID=
VAREJONLINE_CLIENT_SECRET=
VAREJONLINE_REDIRECT_URI=
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_PUBLIC_BASE_URL=
INTEGRATIONS_SECRET_KEY=
STORAGE_DRIVER=
```

> `PDF_HTML_BROWSER_PATH` não precisa ser definida — o Dockerfile já configura o Chromium.

### 3. Domínio

- Railway gera um domínio gratuito tipo `catalogos-xxx.up.railway.app`
- Para usar o domínio customizado: **Settings → Networking → Custom Domain**
- Ao definir o domínio final, atualizar `NEXTAUTH_URL`, `PUBLIC_BASE_URL` e `VAREJONLINE_REDIRECT_URI`

### 4. O que acontece em cada deploy

O Railway vai:
1. Fazer o build da imagem Docker (instala Node, Chromium, builda o Next.js)
2. Ao iniciar: roda `prisma migrate deploy` automaticamente
3. Sobe o servidor Next.js

Não é necessário PM2, Nginx ou SSH.

---

## Estratégia segura para migrar sem risco

Não cancelar a VPS antes de confirmar que o Railway funciona.

```
VPS rodando
  → configurar Railway em paralelo
  → testar Railway (login, sync, geração de PDF)
  → apontar domínio para Railway
  → confirmar funcionamento por 1-2 dias
  → cancelar a VPS
```

---

## Voltar para a VPS a qualquer momento

Se o Railway der problema e for necessário retornar, rodar na VPS:

```bash
cd /var/www/catalogos-api-lab/app
git fetch origin
git checkout main
git pull
bash ./scripts/deploy-platon-vps.sh
```

O banco e as imagens nunca são afetados — a VPS volta ao ar como estava.
