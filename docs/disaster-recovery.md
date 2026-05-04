# Disaster Recovery

## Objetivo

Garantir restauracao do Catalogo Facil em caso de falha de VPS, bloqueio da conta, erro humano ou corrupcao operacional.

## Camadas de backup

### Codigo

- fonte principal: GitHub
- branch operacional atual deve estar sempre pushada

### VPS

- snapshot na Platon antes de mudancas importantes
- backup compactado de arquivos criticos:
  - `.env`
  - configuracao do Nginx
  - `pm2 dump`
  - uploads locais, se existirem

### Banco

- dump regular do Supabase/PostgreSQL
- guardar fora da VPS

### Storage

- backup do bucket `product-images`
- guardar fora da VPS

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

## Restore base

1. Provisionar nova VPS
2. Instalar Node, PM2, Nginx e dependencias do Playwright
3. Clonar o repositorio correto
4. Restaurar `.env`
5. Restaurar configuracao do Nginx
6. Restaurar PM2 ou fazer deploy limpo
7. Restaurar banco
8. Restaurar storage
9. Rodar deploy
10. Validar `/dashboard` e fluxos criticos

## Frequencia sugerida

- snapshot da VPS: antes de mudancas grandes e semanalmente
- dump do banco: semanal ou diario, conforme criticidade
- backup de storage: semanal
- teste de restore: mensal
