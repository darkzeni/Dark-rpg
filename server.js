const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =========================
// SAVE SYSTEM (TEMP)
// =========================
const SAVE_FILE = "save.json";

let players = {};

if (fs.existsSync(SAVE_FILE)) {
  players = JSON.parse(fs.readFileSync(SAVE_FILE));
}

function saveGame() {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(players, null, 2));
}

// =========================
// HAX SCALING (POWER)
// =========================
const haxScaling = {
  F: 1,
  E: 1.2,
  D: 1.5,
  C: 2,
  B: 3,
  A: 5,
  S: 10
};

// =========================
// PLAYER INIT
// =========================
function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      hp: 100,
      stats: {
        strength: 5,
        agility: 5
      },
      abilities: ["punch"],
      haxLevel: "F",

      inventory: { stone: 20 },

      memory: [],
      createdItems: [],
      quests: []
    };
  }
  return players[id];
}

// =========================
// AI GENERATION SYSTEM
// =========================
function generateContent(p, input) {
  if (input.includes("create") || input.includes("make")) {
    let item = "Item_" + Math.floor(Math.random() * 10000);
    p.createdItems.push(item);
    return `You created ${item}. It now exists permanently.`;
  }

  if (input.includes("quest")) {
    let quest = "Defeat " + (Math.floor(Math.random() * 5) + 1) + " enemies";
    p.quests.push(quest);
    return `New Quest: ${quest}`;
  }

  return null;
}

// =========================
// MAIN AI / COMMAND ENGINE
// =========================
function interpret(input, p) {
  input = input.toLowerCase();

  // memory
  p.memory.push(input);

  // AI generation
  let gen = generateContent(p, input);
  if (gen) return gen;

  // TRAIN (balanced)
  if (input.includes("train")) {
    let gain = Math.random() < 0.7 ? 1 : 2;

    if (p.stats.strength > 50) gain = 0.5;
    if (p.stats.strength > 100) gain = 0.2;

    p.stats.strength += gain;

    return `You trained. Strength +${gain.toFixed(1)} (now ${p.stats.strength.toFixed(1)})`;
  }

  // COMBAT
  if (input.includes("fight") || input.includes("attack")) {
    let base = p.stats.strength;
    let multi = haxScaling[p.haxLevel];

    let dmg = Math.floor((Math.random() * 10 + base) * multi);

    let enemyHp = 20 + Math.random() * 30;

    if (dmg >= enemyHp) {
      p.stats.strength += 0.5;
      return `You won the fight. Damage: ${dmg}. Small strength gain.`;
    } else {
      p.hp -= 10;
      return `You lost. HP now ${p.hp}`;
    }
  }

  // ABILITIES
  if (input.includes("abilities")) {
    return "Abilities: " + p.abilities.join(", ");
  }

  if (input.includes("learn")) {
    if (!p.abilities.includes("fireball")) {
      p.abilities.push("fireball");
      return "You learned Fireball 🔥";
    }
    return "You already know that.";
  }

  // HAX PROGRESSION
  if (input.includes("limit break")) {
    const order = ["F","E","D","C","B","A","S"];
    let i = order.indexOf(p.haxLevel);

    if (i < order.length - 1) {
      p.haxLevel = order[i + 1];
      return `Limit broken. Hax now ${p.haxLevel}`;
    }

    return "Max hax reached.";
  }

  // MEMORY QUERIES
  if (input.includes("what did i create")) {
    return p.createdItems.length
      ? p.createdItems.join(", ")
      : "Nothing created yet.";
  }

  if (input.includes("quests")) {
    return p.quests.length
      ? p.quests.join("\n")
      : "No quests.";
  }

  // STATS
  if (input.includes("stats")) {
    return JSON.stringify(p.stats, null, 2);
  }

  // HEAL
  if (input.includes("heal")) {
    p.hp = 100;
    return "Healed to full.";
  }

  // INVENTORY
  if (input.includes("inventory")) {
    return JSON.stringify(p.inventory, null, 2);
  }

  // FALLBACK AI
  return `I understand parts of that.

Try:
- train
- fight
- create
- quest
- abilities

You said: "${input}"`;
}

// =========================
// ROUTES
// =========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/command", (req, res) => {
  const { user, command } = req.body;

  const p = getPlayer(user || "player1");

  let reply = interpret(command || "", p);

  saveGame();

  res.json({ msg: reply, player: p });
});

// =========================
// LEADERBOARD
// =========================
app.get("/leaderboard", (req, res) => {
  let board = Object.entries(players)
    .map(([name, data]) => ({
      name,
      strength: data.stats.strength
    }))
    .sort((a, b) => b.strength - a.strength);

  res.json(board);
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on " + PORT);
});
