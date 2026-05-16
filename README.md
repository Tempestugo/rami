# 🀄 Rami — Hanzi Graph Explorer

> Ferramenta interativa de mapeamento mental e memorização de caracteres chineses.

---

## Arquitetura

```
rami/
├── backend/
│   ├── controllers/     # Handlers Express (graphController, phraseController)
│   ├── routes/          # Rotas da API (/api/graph, /api/phrases)
│   ├── data/            # Banco de dados de caracteres e frases em JS
│   ├── services/        # Lógica de negócio pura (graphService, phraseService)
│   └── server.js        # Entry point Express
├── frontend/
│   └── src/
│       ├── components/  # RadialMenu, PhraseSelectionBar
│       ├── features/    # SidebarFilters, GraphCanvas, DetailsPanel, PhraseModal
│       ├── services/    # api.js (axios calls)
│       ├── store/       # useStore.js (Zustand)
│       ├── App.jsx
│       └── main.jsx
└── package.json         # Root — gatilho de build para Hostinger
```

---

## Stack

| Camada         | Tecnologia                          |
|----------------|-------------------------------------|
| Frontend       | React 18 + Vite + TailwindCSS       |
| Grafo          | vis-network                         |
| Stroke Order   | hanzi-writer                        |
| Estado Global  | Zustand                             |
| Backend        | Node.js + Express                   |
| Banco de Dados | JSON embarcado (→ SQLite em produção) |

---

## Rodando Localmente

### Pré-requisitos
- Node.js >= 18

### 1. Instalar dependências

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Iniciar em modo desenvolvimento

```bash
# Terminal 1 — Backend (porta 3001)
cd backend && node server.js

# Terminal 2 — Frontend (porta 5173 com proxy /api)
cd frontend && npm run dev
```

Acesse: **http://localhost:5173**

---

## Deploy na Hostinger

A Hostinger executa o comando `npm run build` na raiz e depois `npm start`.

O `package.json` raiz faz:
1. `cd frontend && npm install && npm run build` → gera `/frontend/dist`
2. `cd backend && npm install`

O `server.js` detecta `NODE_ENV=production` e serve a pasta `/frontend/dist` como estático.

### Variáveis de ambiente
```
NODE_ENV=production
PORT=3001  # ou a porta configurada pela Hostinger
```

---

## API

### `GET /api/graph`
| Param    | Tipo    | Default | Descrição                     |
|----------|---------|---------|-------------------------------|
| maxHsk   | number  | 6       | Nível máximo HSK a incluir    |
| context  | string  | null    | Tag semântica (ex: `cozinha`) |
| mode     | string  | `evo`   | `dag` \| `evo` \| `sim`      |

**Resposta:**
```json
{
  "success": true,
  "data": {
    "nodes": [{ "id": "木", "pinyin": "mù", "meaning": "wood", "hsk": 1, "tags": ["natureza"] }],
    "edges": [{ "from": "木", "to": "林" }]
  }
}
```

### `GET /api/graph/character/:id`
Retorna dados completos de um caractere.

### `POST /api/phrases/build`
```json
{ "chars": ["我", "吃", "水", "果"] }
```
Retorna frases reais que contêm o maior número de caracteres selecionados.

---

## Os Três Pilares da Memória

| Pilar                    | Implementação                  |
|--------------------------|--------------------------------|
| Memória Motora           | HanziWriter + Modo Quiz        |
| Memória Lógica/Estrutural | Grafo de componentes (DAG)    |
| Memória Associativa      | Filtro semântico por contexto  |

---

## Roadmap

- [ ] ETL pipeline: Make Me a Hanzi + CC-CEDICT → SQLite
- [ ] Embeddings vetoriais reais (Python + all-MiniLM-L6-v2 → LanceDB)
- [ ] Lazy Loading progressivo (expandir nó a nó)
- [ ] Integração Tatoeba para banco de frases expandido
- [ ] Sistema de usuários + progresso HSK persistido
- [ ] Imagens contextuais via Unsplash API
