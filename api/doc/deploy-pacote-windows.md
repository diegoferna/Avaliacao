# Deploy em pacote ZIP (sem npm install no servidor)

## Ideia

1. Na **sua máquina** (Windows): gera um ZIP com código + `node_modules`
2. No **servidor**: descompacta, configura `.env`, executa `start.bat`

O servidor **não precisa** rodar `npm install`, desde que:

- Servidor seja **Windows** (igual à máquina que gerou o pacote)
- **Node.js** esteja instalado no servidor (só o runtime, não precisa npm)
- Versão do Node **parecida** (ex.: 20.x nos dois)

## Gerar o pacote (sua máquina)

```powershell
cd C:\Users\diego.nascimento\Desktop\Avaliacao\api
powershell -ExecutionPolicy Bypass -File scripts\package-for-deploy.ps1
```

Arquivo gerado em: `api/dist/api-parceiros-deploy-AAAAAMMDD-HHMM.zip`

## No servidor

1. Descompacte o ZIP em `E:\site\api\API_ASUS`
2. Copie `.env.example` → `.env` e preencha (banco, senhas, porta)
3. Se ainda não rodou migrate **neste banco**:  
   `node scripts\migrate-all.js` (uma vez)
4. Inicie:
   - Duplo clique em **`start.bat`**, ou
   - `node server.js`

## O que NÃO vai no ZIP (por segurança)

- `.env` com senhas — configure manualmente no servidor

## Limitações

| Situação | Solução |
|----------|---------|
| Servidor Linux | Não use pacote Windows; rode `npm install` no Linux |
| EPERM no servidor | Use este pacote para evitar npm lá |
| Atualizar dependências | Gere novo ZIP na sua máquina |

## PM2 (opcional, produção)

```cmd
npm install -g pm2
cd E:\site\api\API_ASUS
pm2 start server.js --name api-parceiros
pm2 save
```
