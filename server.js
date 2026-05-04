const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =========================
// SAVE
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
// TIERS + RARITY
// =========================
const tiers = {
  T1: ["stone","iron","wood"],
  T2: ["aetherite","cobalt","frigidium"],
  T3: ["exorite","skynium","emberite"],
  T4: ["nullium","zaphrite","nanite"]
};

const rarities = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];

// =========================
// PLAYER
// =========================
function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      hp: 100,

      stats: {
        strength: 5,
        agility: 5,
        intelligence: 1
      },

      training: {
        active: null,
        queue: []
      },

      inventory: {
        stone: 50,
        iron: 20
      },

      recipes: {},
      recipeXP: {},

      createdItems: [],
      discoveredOres: ["stone","iron"]
    };
  }
  return players[id];
}

// =========================
// TRAINING
// =========================
function processTraining(p) {
  if (!p.training.active && p.training.queue.length > 0) {
    let next = p.training.queue.shift();

    p.training.active = {
      stat: next,
      start: Date.now(),
      duration: 60000
    };
  }

  if (p.training.active) {
    let t = p.training.active;
    let done = Date.now() - t.start >= t.duration;

    if (done) {
      let stat = t.stat;

      let gain = 1;
      if (p.stats[stat] > 50) gain = 0.5;
      if (p.stats[stat] > 100) gain = 0.2;

      p.stats[stat] += gain;
      p.training.active = null;

      return `${stat} training finished (+${gain})`;
    }
  }

  return null;
}

// =========================
// PROGRESSION
// =========================
function getTier(p) {
  let s = p.stats.strength;

  if (s < 20) return "T1";
  if (s < 50) return "T2";
  if (s < 100) return "T3";
  return "T4";
}

function getRarity(p) {
  let roll = Math.random() + (p.stats.intelligence / 100);

  if (roll < 0.4) return "Common";
  if (roll < 0.7) return "Uncommon";
  if (roll < 1.0) return "Rare";
  if (roll < 1.3) return "Epic";
  if (roll < 1.6) return "Legendary";
  return "Mythic";
}

// =========================
// AI RECIPE GENERATION
// =========================
function generateRecipe(item, p) {
  let tier = getTier(p);
  let mats = tiers[tier];

  let req = {};

  for (let i = 0; i < 2; i++) {
    let m = mats[Math.floor(Math.random()*mats.length)];
    req[m] = Math.floor(Math.random()*5)+3;
  }

  // scaling complexity
  if (tier !== "T1") {
    req["core"] = 1;
  }

  if (tier === "T4") {
    req["reactor"] = 1;
  }

  return req;
}

// =========================
// ENGINE
// =========================
function interpret(input, p) {
  input = input.toLowerCase();

  let done = processTraining(p);
  if (done) return done;

  if (p.training.active) {
    if (input.includes("cancel")) {
      p.training.active = null;
      p.training.queue = [];
      return "Training cancelled.";
    }

    let t = p.training.active;
    let left = Math.ceil((t.duration - (Date.now()-t.start))/1000);

    return `Training ${t.stat} (${left}s left)
Queue: ${p.training.queue.join(", ") || "empty"}`;
  }

  // TRAIN
  if (input.startsWith("train")) {
    let stat = input.split(" ")[1];

    if (!p.stats[stat]) return "Invalid stat.";

    if (!p.training.active) {
      p.training.active = {
        stat,
        start: Date.now(),
        duration: 60000
      };
      return `Started training ${stat}`;
    }

    p.training.queue.push(stat);
    return `${stat} added to queue`;
  }

  // MINE
  if (input === "mine") {
    let tier = getTier(p);
    let ore = tiers[tier][Math.floor(Math.random()*tiers[tier].length)];

    p.inventory[ore] = (p.inventory[ore] || 0) + 1;

    return `You mined ${ore} (${tier})`;
  }

  // CREATE
  if (input.startsWith("create") || input.startsWith("make")) {
    let item = input.replace("create","").replace("make","").trim();
    if (!item) return "Create what?";

    let recipe = generateRecipe(item, p);
    let rarity = getRarity(p);

    p.recipes[item] = { req: recipe, rarity };
    p.recipeXP[item] = 0;

    return `You designed a ${rarity} ${item}.

Recipe:
${JSON.stringify(recipe, null, 2)}`;
  }

  // CRAFT
  if (input.startsWith("craft")) {
    let item = input.replace("craft ","");

    let data = p.recipes[item];
    if (!data) return "No recipe.";

    let recipe = data.req;

    for (let r in recipe) {
      if ((p.inventory[r] || 0) < recipe[r]) {
        return "Missing materials.";
      }
    }

    for (let r in recipe) {
      p.inventory[r] -= recipe[r];
    }

    p.recipeXP[item] += 1;

    return `Crafted ${item}. Mastery: ${p.recipeXP[item]}`;
  }

  // BOSS
  if (input === "boss") {
    let hp = 50 + Math.random()*50;
    let dmg = p.stats.strength + Math.random()*15;

    if (dmg >= hp) {
      p.stats.strength += 3;
      return "Boss defeated. You feel stronger.";
    } else {
      p.hp -= 20;
      return `Lost. HP ${p.hp}`;
    }
  }

  if (input === "stats") return JSON.stringify(p.stats,null,2);
  if (input === "inventory") return JSON.stringify(p.inventory,null,2);
  if (input === "recipes") return JSON.stringify(p.recipes,null,2);

  return `Try:
- mine
- train strength
- create sword
- craft sword
- boss`;
}

// =========================
// ROUTES
// =========================
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

app.post("/command",(req,res)=>{
  const {user,command} = req.body;

  let p = getPlayer(user || "player1");

  let msg = interpret(command || "", p);

  saveGame();

  res.json({msg, player:p});
});

app.get("/leaderboard",(req,res)=>{
  let board = Object.entries(players)
    .map(([name,data])=>({
      name,
      strength:data.stats.strength
    }))
    .sort((a,b)=>b.strength-a.strength);

  res.json(board);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>console.log("Running "+PORT));
