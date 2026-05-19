# Swagger (/docs) em producao — Nginx e proxy

## Sintoma

No console do navegador:

- `swagger-ui-bundle.js: Invalid or unexpected token`
- `SwaggerUIBundle is not defined`

Isso quase sempre significa que o arquivo **.js nao chegou como JavaScript** (veio HTML de erro 404/502 ou gzip corrompido).

## Diagnostico rapido

1. Abra **F12 → Network**
2. Recarregue `/docs`
3. Clique em `swagger-ui-bundle.js`
4. Verifique:
   - **Status** deve ser `200`
   - **Content-Type** deve ser `application/javascript` (ou `text/javascript`)
   - Se o Preview mostrar HTML (`<!DOCTYPE` ou `404`), o proxy esta errado

Teste direto na porta da API (sem Nginx):

```
http://IP_DO_SERVIDOR:3001/docs
```

Se funcionar direto mas falhar pelo dominio/Nginx, o problema e configuracao do proxy.

## Variaveis .env na API

```env
NODE_ENV=production
TRUST_PROXY=1

# URL publica que o parceiro usa (com https se tiver TLS)
PUBLIC_API_URL=https://seu-dominio.gov.br

# Somente se o Nginx expoe a API com prefixo de path (ver abaixo)
# API_INDEX_PREFIX=/avaliacao-api
```

## Nginx — API na raiz do dominio

```nginx
location /docs/ {
    proxy_pass http://127.0.0.1:3001/docs/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Evita gzip duplo que corrompe .js
    proxy_set_header Accept-Encoding "";
}

location /api/v1/ {
    proxy_pass http://127.0.0.1:3001/api/v1/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Nginx — API com prefixo (ex.: /avaliacao-api)

Se o usuario acessa `https://dominio/avaliacao-api/docs`:

```nginx
location /avaliacao-api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Accept-Encoding "";
}
```

No `.env` da API:

```env
API_INDEX_PREFIX=/avaliacao-api
PUBLIC_API_URL=https://dominio/avaliacao-api
```

## Checklist

- [ ] `npm install` executado no servidor (pasta `node_modules` completa)
- [ ] PM2/systemd aponta para `api/server.js`
- [ ] Porta `API_PORT` igual ao `proxy_pass`
- [ ] `TRUST_PROXY=1` em producao
- [ ] `swagger-ui-bundle.js` retorna 200 + JavaScript no Network
