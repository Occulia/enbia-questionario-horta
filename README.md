# Enbia — Questionário de Levantamento de Processos (Município da Horta)

Aplicação web simples (Node 20 + Express + PostgreSQL na CT 106) que disponibiliza o questionário do Município da Horta num URL público, sincroniza automaticamente as respostas na base de dados e inclui uma área de administração protegida (`/admin`) para consulta e download do formulário preenchido (`.html`, `.json` Levantamentos, `.txt`).

---

## 1. Estrutura do Projeto

- [`backend/server.js`](./backend/server.js) — Servidor Express, API pública (`/api/questionnaire`), API Admin (`/api/admin/*`) e geradores de download.
- [`backend/questions.js`](./backend/questions.js) — Definição das 4 secções (52 perguntas + 5 campos de identificação + 3 responsáveis de secção), respostas pré-preenchidas da reunião e exportadores (`plainText`, `levantamentosJson`, `buildFilledHtml`).
- [`backend/store.js`](./backend/store.js) — Persistência em PostgreSQL (`192.168.1.3:5432`) com espelho/fallback local em `/app/data/`.
- [`backend/sql/schema.sql`](./backend/sql/schema.sql) — Schema SQL idempotente (`questionnaire_state` e `questionnaire_submissions`), aplicado automaticamente no arranque (`migrate.js`).
- [`frontend/index.html`](./frontend/index.html) — Questionário público com gravação automática no servidor à medida que escrevem e botão de submissão.
- [`frontend/pristine-template.html`](./frontend/pristine-template.html) — Cópia limpa do ficheiro HTML original usada para gerar o download do `.html` autónomo preenchido.
- [`frontend/admin.html`](./frontend/admin.html) — Painel `/admin` protegido por login (`admin` / `Enb_516571516`).
- [`deploy/db-setup.sql`](./deploy/db-setup.sql) — Criação da base de dados e role na CT 106.

---

## 2. Deploy na Infraestrutura Proxmox (`enbiente` · `192.168.1.70`)

### Passo 1 — Criar a Base de Dados na CT 106 (`PostgreSQL` · `192.168.1.3`)
No host Proxmox (`ssh root@192.168.1.70`), entrar na CT 106 e criar a role e a base de dados (atenção ao `ENCODING 'UTF8'` e `TEMPLATE template0` para evitar `SQL_ASCII` neste cluster):

```bash
pct enter 106
runuser -u postgres -- psql -c "CREATE ROLE enbia_forms_app LOGIN PASSWORD 'Enb_516571516';"
runuser -u postgres -- psql -c "CREATE DATABASE enbia_forms OWNER enbia_forms_app ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;"
exit
```
*(As tabelas `questionnaire_state` e `questionnaire_submissions` são criadas automaticamente pelo `migrate.js` no arranque do contentor).*

### Passo 2 — Subir o Serviço na CT 100 (`LowServices` · `192.168.1.5`) ou CT 108 (`NormalServices` · `192.168.1.4`)
Exemplo na **CT 100 (`192.168.1.5`, porta `4400`)**:

```bash
pct enter 100
mkdir -p /opt/enbia-questionario-horta/data
cat > /opt/enbia-questionario-horta/.env << 'EOF'
SERVICE_NAME=enbia-questionario-horta
BIND_IP=192.168.1.5
PORT=4400
HOST=0.0.0.0
PGHOST=192.168.1.3
PGPORT=5432
PGDATABASE=enbia_forms
PGUSER=enbia_forms_app
PGPASSWORD=Enb_516571516
DISPLAY_TZ=Europe/Lisbon
ADMIN_USER=admin
ADMIN_PASS=Enb_516571516
EOF
chmod 600 /opt/enbia-questionario-horta/.env
```

Depois de sincronizar o código (via `git push main` com o runner ou copiando para `/opt/enbia-questionario-horta`):
```bash
cd /opt/enbia-questionario-horta && docker compose up -d --build
curl -s http://192.168.1.5:4400/health
curl -s http://192.168.1.5:4400/health/db
```

### Passo 3 — Expor URL Público no Cloudflare Tunnel (no Host Proxmox `192.168.1.70`)
O `cloudflared` corre no **host Proxmox (`192.168.1.70`)** sobre o túnel `enbiente-nas`.
Para publicar em `horta-questionario.enbia.pt`:

1. Editar `/etc/cloudflared/config.yml` no host (`.70`) e adicionar antes do catch-all `http_status:404`:
   ```yaml
     - hostname: horta-questionario.enbia.pt
       service: http://192.168.1.5:4400
   ```
2. Criar a rota DNS e recarregar o túnel sem downtime:
   ```bash
   cloudflared tunnel route dns enbiente-nas horta-questionario.enbia.pt
   cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
   systemctl reload cloudflared
   ```

---

## 3. Acessos

- **Questionário Público (Município da Horta)**: `https://horta-questionario.enbia.pt/`
- **Área de Administração Enbia**: `https://horta-questionario.enbia.pt/admin`
  - **User**: `admin`
  - **Pass**: `Enb_516571516`
