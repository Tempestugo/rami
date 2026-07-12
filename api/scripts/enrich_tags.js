import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../_data/hanziData.js');

const tagMappings = {
  cozinha: ["kitchen", "cook", "food", "eat", "drink", "bowl", "plate", "meat", "rice", "vegetable", "fruit", "meal", "soup", "boil", "fry", "bake", "cup", "spoon", "fork", "knife", "sweet", "sour", "bitter", "spicy", "salt", "sugar", "oil", "water", "tea", "coffee", "wine", "beer", "milk", "bread", "cake", "egg", "fish", "chicken", "pork", "beef", "hungry", "thirsty", "taste", "delicious"],
  natureza: ["nature", "tree", "forest", "mountain", "river", "water", "wood", "grass", "flower", "stone", "rock", "earth", "soil", "sand", "sky", "cloud", "rain", "snow", "wind", "sun", "moon", "star", "ocean", "sea", "lake", "beach", "island", "animal", "bird", "insect", "wild", "plant", "leaf", "root"],
  pessoa: ["person", "man", "woman", "child", "people", "human", "boy", "girl", "baby", "adult", "friend", "enemy", "crowd", "body", "head", "face", "eye", "ear", "nose", "mouth", "tooth", "hair", "hand", "arm", "finger", "leg", "foot", "heart", "blood", "bone", "skin", "mind", "soul"],
  tempo: ["time", "day", "month", "year", "clock", "hour", "minute", "second", "tomorrow", "yesterday", "today", "now", "past", "present", "future", "morning", "noon", "afternoon", "evening", "night", "early", "late", "soon", "quick", "fast", "slow"],
  clima: ["weather", "rain", "snow", "wind", "cloud", "sun", "hot", "cold", "ice", "warm", "cool", "freeze", "melt", "dry", "wet", "storm", "thunder", "fog", "mist"],
  numero: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred", "thousand", "million", "number", "count", "math", "add", "subtract", "multiply", "divide", "fraction", "percent", "half"],
  familia: ["family", "father", "mother", "brother", "sister", "son", "daughter", "uncle", "aunt", "cousin", "grandfather", "grandmother", "parent", "child", "husband", "wife", "marry", "wedding", "relative", "generation", "home", "house"],
  acao: ["action", "go", "come", "walk", "run", "jump", "hit", "make", "do", "see", "hear", "listen", "look", "watch", "speak", "talk", "say", "tell", "ask", "answer", "read", "write", "eat", "drink", "sleep", "wake", "sit", "stand", "give", "take", "buy", "sell", "work", "play", "stop", "start", "open", "close"],
  lugar: ["place", "house", "room", "city", "country", "road", "street", "school", "shop", "store", "market", "office", "factory", "bank", "hospital", "hotel", "restaurant", "park", "farm", "village", "town", "area", "center", "edge", "north", "south", "east", "west", "here", "there", "inside", "outside"],
  estudo: ["study", "learn", "school", "book", "read", "write", "pen", "paper", "word", "student", "teacher", "class", "lesson", "course", "science", "art", "history", "math", "language", "test", "exam", "grade", "university", "college", "library", "knowledge", "wisdom", "understand", "know", "think", "idea"]
};

// Build regex patterns for each category
const tagRegexes = {};
for (const [tag, words] of Object.entries(tagMappings)) {
  tagRegexes[tag] = new RegExp(`\\b(${words.join('|')})\\b`, 'i');
}

async function main() {
  console.log('Lendo hanziData.js...');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  
  const arrayStart = rawData.indexOf('[');
  if (arrayStart === -1) {
    console.error('Array não encontrado em hanziData.js');
    process.exit(1);
  }
  
  const arrayStr = rawData.substring(arrayStart).replace(/;\\s*$/, '');
  
  let data;
  try {
    data = JSON.parse(arrayStr);
  } catch (e) {
    console.error('Erro ao fazer parse de JSON. Tentando Function eval...');
    data = new Function('return ' + arrayStr)();
  }
  
  let modifiedCount = 0;
  
  data.forEach(item => {
    if (!item.tags) item.tags = [];
    let added = false;
    
    if (item.meaning) {
      for (const [tag, regex] of Object.entries(tagRegexes)) {
        if (regex.test(item.meaning) && !item.tags.includes(tag)) {
          item.tags.push(tag);
          added = true;
        }
      }
    }
    
    if (added) modifiedCount++;
  });
  
  console.log(`Atualizando ${modifiedCount} caracteres com novas tags.`);
  
  const output = `/**\n * hanziData.js — Master character database\n * Atualizado automaticamente via script de importação.\n */\n\nexport const hanziData = ${JSON.stringify(data, null, 2)};\n`;
  
  fs.writeFileSync(dataPath, output, 'utf8');
  console.log('hanziData.js salvo com sucesso!');
}

main();
