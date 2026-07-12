# Rami — Hanzi Graph Explorer

> Ferramenta interativa de mapeamento mental e memorização de caracteres chineses (漢字)

##  Deploy na Vercel (passo a passo)

### Opção A — Deploy pela interface web (mais fácil)

1. Faça push deste projeto para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**
3. Importe o repositório do GitHub
4. Nas configurações de build, a Vercel detectará automaticamente:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Clique em **Deploy** — pronto! 

### Opção B — Deploy pela CLI da Vercel

```bash
# Instalar CLI da Vercel
npm i -g vercel

# Dentro da pasta do projeto
cd rami-vercel
npm install
vercel
```

Responda as perguntas da CLI:
- **Set up and deploy?** → `Y`
- **Which scope?** → Sua conta
- **Link to existing project?** → `N`
- **Project name?** → `rami-hanzi-explorer`
- **In which directory?** → `.`
- **Override settings?** → `N`

---

## ️ Estrutura do Projeto

```
rami-vercel/
├── api/                        # Vercel Serverless Functions (Node.js)
│   ├── _data/
│   │   ├── hanziData.js        # Banco de caracteres (CommonJS)
│   │   └── phraseData.js       # Banco de frases (CommonJS)
│   ├── graph/
│   │   ├── index.js            # GET /api/graph
│   │   ├── tags.js             # GET /api/graph/tags
│   │   └── character/
│   │       └── [id].js         # GET /api/graph/character/:id
│   └── phrases/
│       └── build.js            # POST /api/phrases/build
├── src/                        # React Frontend (Vite + Tailwind)
│   ├── components/
│   │   ├── PhraseSelectionBar.jsx
│   │   └── RadialMenu.jsx
│   ├── features/
│   │   ├── GraphCanvas.jsx     # Vis.js network graph
│   │   ├── SidebarFilters.jsx
│   │   ├── DetailsPanel.jsx    # HanziWriter + quiz
│   │   └── PhraseModal.jsx
│   ├── services/
│   │   └── api.js              # Axios API client
│   ├── store/
│   │   └── useStore.js         # Zustand global state
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   └── rami-icon.svg
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                 # Rotas e headers CORS
└── package.json
```

---

##  API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/graph` | Grafo filtrado por HSK, contexto e modo |
| `GET` | `/api/graph/tags` | Lista todas as tags semânticas |
| `GET` | `/api/graph/character/:id` | Detalhe completo de um caractere |
| `POST` | `/api/phrases/build` | Encontrar frases com os caracteres selecionados |

### Parâmetros de `/api/graph`

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `maxHsk` | number | `6` | Nível máximo HSK a incluir |
| `context` | string | `null` | Tag semântica (ex: `cozinha`, `natureza`) |
| `mode` | string | `evo` | `dag`, `evo` ou `sim` |

### Corpo de `/api/phrases/build`

```json
{ "chars": ["我", "吃", "水", "果"] }
```

---

## ️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Instalar CLI da Vercel para emular serverless localmente
npm i -g vercel

# Rodar em modo desenvolvimento (emula a Vercel localmente)
vercel dev

# OU apenas o frontend (sem as APIs):
npm run dev
```

> **Dica:** `vercel dev` é o modo preferido para desenvolvimento, pois emula exatamente o comportamento de produção, incluindo as serverless functions em `/api`.

---

## ️ Por que essa estrutura funciona na Vercel

A Vercel trata automaticamente:

- **Pasta `api/`** → cada arquivo `.js` vira uma serverless function (Node.js runtime)
- **Rotas dinâmicas** → `[id].js` vira `/api/graph/character/:id` automaticamente
- **Build do frontend** → Vite gera `dist/` que é servido como static hosting
- **`vercel.json`** → configura rewrites para SPA (evita 404 em refresh) e headers CORS

---

##  Funcionalidades

### Três Modos de Grafo
- **Evolução (evo):** Radical → Caracteres Derivados
- **Analítico (dag):** Caractere → Radicais Componentes
- **Similaridade (sim):** Conexões por forma visual (+1 traço)

### Filtros
- **HSK Slider:** Filtra do nível 1 ao 6
- **Contexto Semântico:** Cozinha, Natureza, Pessoa, Tempo, etc.

### Painel de Detalhes
- Animação de traços (HanziWriter)
- Quiz interativo de escrita
- Componentes do caractere

### Construtor de Frases
- Selecione múltiplos caracteres no grafo
- O algoritmo busca frases reais contendo esses caracteres
- Exibe pinyin e tradução

---

##  Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Estilo | Tailwind CSS |
| Grafo | Vis.js (vis-network) |
| Traços | HanziWriter |
| Estado | Zustand |
| HTTP | Axios |
| Backend | Vercel Serverless Functions (Node.js) |
| Hosting | Vercel |
