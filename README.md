# Better · Portal

Next.js App Router, React, TypeScript e FullCalendar. Projeto integrado ao backend Django em `../howie`. Produto: Better. Domínio público: https://better.wardie.com.br. Wardie é a empresa responsável.

## Desenvolvimento local

No backend:

```sh
venv/bin/python manage.py migrate --settings=core.portal_dev_settings
venv/bin/python manage.py seed_portal_demo --settings=core.portal_dev_settings
venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=core.portal_dev_settings
```

Essa configuração usa exclusivamente `.deploy/portal-preview.sqlite3`; não usa o `DATABASE_URL` de produção. O seed é bloqueado nas configurações normais.

No frontend:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Conta **exclusivamente local de demonstração**: `demo@wardie.local`, senha `Demonstracao2026!`. Também é possível criar uma conta pela interface. Os agendamentos e profissionais pré-carregados pertencem ao Studio Aurora · Demonstração. Nenhum número de WhatsApp está conectado a essa conta.

## Funcionalidades

- Home pública renderizada no servidor, exemplo ilustrativo de atendimento, recursos, perguntas frequentes e demonstração gratuita.
- Preços desabilitados com o aviso solicitado; nenhuma cobrança implementada.
- Cadastro, login, logout e sessão em cookie HttpOnly. Nenhum token no localStorage.
- Dashboard com dados reais da empresa, agentes, pausa/retomada, conversas com reinício de contexto e uso da IA.
- Serviços, profissionais, vínculos profissional/serviço, expedientes, clientes e bloqueios.
- Agenda em mês, semana, dia e lista; filtros por profissional, consulta de slots, agendamento, confirmação, cancelamento e remarcação. No celular, inicia na visão do dia.
- Todos os horários operacionais usam America/Fortaleza; não existe sincronização externa com Google Agenda.
- Criação de agente não conecta automaticamente WhatsApp. Embedded Signup/Coexistence exige uma implementação separada e configuração do app Meta.

## Configuração

- `BACKEND_URL`: endereço do Django, disponível **apenas no servidor Next**, sem `/api/v1` no final. A API é intermediada por `/api/*` no Next.
- `SITE_URL`: origem pública definitiva. Usada em canonical, sitemap, Open Graph e validação de origem. Atualizar antes do build de produção. Domínio definido: https://better.wardie.com.br.
- A marca visual está em `src/components/brand.tsx`, o tema em `src/app/globals.css` e os metadados em `src/app/layout.tsx`.
- Fontes DM Sans e Manrope locais, distribuídas sob SIL Open Font License. Não há carregamento de fontes do Google no navegador.

## Validação

```sh
npm run build
npm run typecheck
# Requer ambos os servidores locais e a configuração isolada acima.
npm test
```

Os testes integrados são restritos a localhost e criam empresas de teste na base local. Validam SEO, proteção de rotas, cookie HttpOnly, rejeição de origens externas, isolamento entre empresas, configuração dos serviços e ciclo de agendamento.

## Publicação

O frontend precisa de runtime Node compatível com Next.js, HTTPS e acesso ao backend; não é uma exportação HTML estática. Rode `npm run build` e `npm start`. O cookie de sessão recebe `Secure` em produção. Use HTTPS também entre Next e Django quando estiverem em hosts diferentes.

Antes de publicar: aplicar as migrações do backend (`portal.0001` e `ia.0006`), configurar `SITE_URL=https://better.wardie.com.br`, configurar cache compartilhado/rate limiting para múltiplas instâncias, definir a operação da demonstração e revisar termos/política de privacidade com os dados e canais oficiais da empresa. A indexação pelo Google depende da publicação e do rastreamento; a base técnica de SEO já está incluída.

O backend guarda pedidos de demonstração no Admin, sem disparo de e-mail automático. Cada usuário do portal pertence a uma empresa. Usuários existentes do Django precisam de vínculo explícito em **Company memberships** no Admin; cadastrar conta não dá acesso a empresas pré-existentes.
# howie-fe
