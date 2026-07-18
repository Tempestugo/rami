// src/data/abilityTreeData.js

export const ABILITY_NODES = {
    "kou_root": {
        id: "kou_root",
        hanzi: "口",
        pinyin: "kǒu",
        name: "A Fundação da Palavra",
        pillar: "intelligence",
        description: "Desbloqueia o conceito de fala. Aumenta a inteligência base do império.",
        cost: 50,
        requires: [], // Nó inicial
        hskLevel: 1,
        buff: { stat: "intelligence", baseValue: 10 }
    },
    "kou_eat": {
        id: "kou_eat",
        hanzi: "吃",
        pinyin: "chī",
        name: "Subsistência Básica",
        pillar: "subsistence",
        description: "Ato de comer. Reduz a fome global da população e evita revoltas.",
        cost: 100,
        requires: ["kou_root"],
        hskLevel: 1,
        buff: { stat: "starvation", baseValue: -20 }
    },
    "kou_drink": {
        id: "kou_drink",
        hanzi: "喝",
        pinyin: "hē",
        name: "Gestão de Recursos Hídricos",
        pillar: "subsistence",
        description: "Ato de beber. Melhora a saúde pública em províncias conquistadas.",
        cost: 120,
        requires: ["kou_root"],
        hskLevel: 1,
        buff: { stat: "health", baseValue: 15 }
    },
    "kou_ask": {
        id: "kou_ask",
        hanzi: "问",
        pinyin: "wèn",
        name: "Rede de Espionagem",
        pillar: "expansion",
        description: "Ato de perguntar. Atrasa o avanço de impérios rivais (Bots) revelando as suas rotas.",
        cost: 150,
        requires: ["kou_root"],
        hskLevel: 1,
        buff: { stat: "bot_delay", baseValue: 10 } // Reduz o advanceRate dos bots
    }
};