# Disaster Recovery

## Objetivo

Garantir restauracao do Catalogo Facil em caso de falha de VPS, bloqueio de conta, erro humano ou corrupcao operacional.

## O que precisa ser salvo

### Codigo

- repositório GitHub do Catalogo Facil
- branch oficial `main`

### VPS

- arquivo `.env` da aplicacao
- configuracao do Nginx
- `pm2 dump`
- uploads locais, se existirem

### Banco

- dump regular do Supabase/PostgreSQL

### Storage

- backup do bucket `product-images`

## Onde cada camada vive hoje

- app web: VPS Platon
- banco: Supabase
- storage de imagens: Supabase Storage/S3
- codigo: GitHub

## Backup portatil da VPS

Exemplo:

```bash
sudo tar -czf /home/ubuntu/catalogofacil-vps-backup-$(date +%F).tar.gz \
  /var/www/catalogos-api-lab/app/.env \
  /etc/nginx/sites-available/catalogos-api-lab \
  /etc/nginx/sites-enabled/catalogos-api-lab \
  /home/ubuntu/.pm2/dump.pm2 \
  /var/www/catalogos-api-lab/uploads
```

## Ordem recomendada de restore

1. provisionar nova VPS
2. instalar Node, PM2, Nginx e dependencias do Playwright
3. clonar o repositorio correto
4. restaurar `.env`
5. restaurar configuracao do Nginx
6. restaurar banco Supabase/PostgreSQL
7. restaurar bucket/storage
8. restaurar PM2 ou fazer deploy limpo
9. rodar deploy oficial
10. validar fluxos criticos

## Checklist pos-restore

- `curl http://127.0.0.1:3000/dashboard`
- `curl https://catalogofacil.solucaoviavel.com/dashboard`
- login administrativo funcionando
- dashboard abrindo
- Base Geral acessivel
- Share Links abrindo
- exportacao PDF funcionando
- integracao Varejonline com status consistente

## Frequencia recomendada

- snapshot da VPS: antes de mudancas grandes e semanalmente
- dump do banco: diario ou semanal, conforme criticidade
- backup de storage: semanal
- teste de restore: mensal ou a cada mudanca estrutural grande

## Regra operacional

Backup so e confiavel quando existe restore compreendido e testado.
Nao tratar snapshot, dump e backup de storage como equivalentes; cada camada cobre um risco diferente.
