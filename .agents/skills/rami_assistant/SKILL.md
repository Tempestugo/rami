---
name: rami_assistant
description: Assist in developing, debugging, and expanding the Rami Hanzi Explorer project, covering game modes like Lumi Warfare and Siege Mode, learning modules, and database operations.
---

# Rami Project Assistant Skill

Welcome to the Rami Hanzi Explorer workspace! This skill provides developer guidelines, architecture maps, and system design specifications for the project.

## 📁 Project Structure

Here is a map of the key directories and files in the codebase:

- [server.js](file:///C:/Users/coffe/Downloads/rami/server.js): The main Express backend server containing game and graph API endpoints.
- [db.js](file:///C:/Users/coffe/Downloads/rami/db.js): Database connection setup using `mysql2/promise` with automatic fallback from local to remote Hostinger server.
- [migrate.js](file:///C:/Users/coffe/Downloads/rami/migrate.js): Database migration script to populate characters, components, and phrases.
- **`api/`**: Server-side API handlers.
  - [api/game/siege.js](file:///C:/Users/coffe/Downloads/rami/api/game/siege.js): Generates waves/hordes for the Siege Mode.
  - [api/game/lessonGenerator.js](file:///C:/Users/coffe/Downloads/rami/api/game/lessonGenerator.js): Lesson/learning path handler.
  - [api/graph/index.js](file:///C:/Users/coffe/Downloads/rami/api/graph/index.js): Fetches Hanzi relationship graphs.
  - [api/phrases/build.js](file:///C:/Users/coffe/Downloads/rami/api/phrases/build.js): Endpoint for building Chinese phrases.
  - **`api/_data/`**: JSON and JS datasets including HSK 1 vocabulary, grammar rules, and character data.
- **`src/`**: Vite + React frontend code.
  - [src/App.jsx](file:///C:/Users/coffe/Downloads/rami/src/App.jsx): Root app component managing view switching (Modes: Home, Learn, Explorer, Frases, Cerco, Cartas, Arena, Usuário).
  - **`src/features/`**: Primary page modules.
    - [src/features/LumiWarfare.jsx](file:///C:/Users/coffe/Downloads/rami/src/features/LumiWarfare.jsx): Arena battle mode (HTML5 Canvas 2D game loop + card actions).
    - [src/features/SiegeMode.jsx](file:///C:/Users/coffe/Downloads/rami/src/features/SiegeMode.jsx): Stroke-drawing defense game utilizing `hanzi-writer` and Canvas.
    - [src/features/LearningTrail.jsx](file:///C:/Users/coffe/Downloads/rami/src/features/LearningTrail.jsx): Interactive lesson mapping and study trail.
    - [src/features/FraseCook.jsx](file:///C:/Users/coffe/Downloads/rami/src/features/FraseCook.jsx): Phrase cooking/assembly sandbox interface.
    - [src/features/GraphCanvas.jsx](file:///C:/Users/coffe/Downloads/rami/src/features/GraphCanvas.jsx): Renders node relationships via `vis-network`.
  - **`src/engine/`**: Core logic independent of visual layers.
    - [src/engine/cardEngine.js](file:///C:/Users/coffe/Downloads/rami/src/engine/cardEngine.js): Pure card calculations, SRS formulas, and element interactions.
  - **`src/store/`**: Frontend state management.
    - [src/store/useStore.js](file:///C:/Users/coffe/Downloads/rami/src/store/useStore.js): Global Zustand store.

---

## 🎴 Core Game Mechanics & Elements

The system revolves around Chinese characters treated as Cards, classified into **7 Element Families** representing basic Chinese radicals/concepts.

### 1. Element Families & Combat Effects
When cards reach Level 4 or higher (or triggering specific events), they activate passive or active abilities:

| Family | Chinese character | Effect Name | Combat Behavior |
|---|---|---|---|
| **水** | Water | **Slow** | Reduces speed of all enemies in the area by 40% (speedMulti * 0.6). |
| **火** | Fire | **Burn** | Splash area damage: targets within radius take 40% of character's base damage. |
| **木** | Wood | **Shield** | Reinforces the castle's defenses (adds +15 shield points). |
| **金** | Metal | **Ricochet** | Attacks bounce to secondary targets (targets count scales with level). |
| **土** | Earth | **Stun** | Stuns/paralyzes hit targets for 90 frames. |
| **人** | Human | **Buff** | Passive damage bonus (+15% damage) applied to the entire deck. |
| **口** | Mouth | **Push** | Knocks enemies back away from the castle (+80px displacement). |

### 2. Card Scaling & SRS Progression
- **Levels 1 to 5**: Levels map to Spaced Repetition System (SRS) intervals.
- **SRS update rules**:
  - Correct answer / Success ➔ Level increments (max 5).
  - Incorrect answer / Failure ➔ Level decrements (min 1).
- **Damage Multipliers & Features**:
  - *Level 1*: 1.0x damage, no secondary effects, no ricochet.
  - *Level 2*: 1.1x damage, enables unit aura.
  - *Level 3*: 1.1x damage, ricochet to 1 target.
  - *Level 4*: 1.2x damage, ricochet to 2 targets, enables secondary family effect.
  - *Level 5*: 1.4x damage, ricochet to infinite nearby targets, secondary family effect active.

### 3. Deck Synergy
- Each card receives **+5% damage** for every other card in the deck belonging to the same element family (maximum synergy bonus +35%).
- Having at least one **人 (Human)** card in the active deck grants an additional **+15% global damage** to all cards.

---

## 💾 Database Schema

The app stores dictionary metadata in these primary tables:

1. **`characters`**
   - `hanzi` (VARCHAR): The Chinese character (Primary Key).
   - `pinyin` (VARCHAR): Pinyin pronunciation.
   - `meaning` (VARCHAR): English/Portuguese translation definitions.
   - `hsk_level` (INT): HSK level classification (1 to 6).

2. **`character_components`**
   - Maps parent characters to component child characters (e.g., parent `林` contains component `木`).
   - Used for structural decomposition and boss fights.

3. **`phrases`**
   - Stores vocabularies and multi-character phrase structures.

---

## 🛠️ Developer Rules & Guidelines

1. **Aesthetics & UI Styling**:
   - The project uses **Tailwind CSS**. Stick to Tailwind utility classes (e.g., ink/vermillion/gold palettes) when adding components or styling pages.
   - Maintain the premium, clean, dark-mode design with subtle glow indicators and neon gradient frames.
2. **State Management**:
   - Keep global UI states (e.g., active target, active filters, selected cards) within [src/store/useStore.js](file:///C:/Users/coffe/Downloads/rami/src/store/useStore.js).
   - Component-local animation frame states, particle effects, and mouse cursors should use standard `useRef` or local state inside the Canvas components.
3. **Database Integration**:
   - Use the pool proxy exported by [db.js](file:///C:/Users/coffe/Downloads/rami/db.js) for database queries on the backend.
   - Always prepare query fallbacks for local databases.
4. **Locale**:
   - All user-facing UI text, menus, notifications, and tutorials are in **Portuguese (pt-BR)**. Keep your translations aligned with the game's vocabulary style.
