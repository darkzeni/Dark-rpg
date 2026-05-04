const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ================= SAVE =================
const SAVE_FILE = "save.json";
let players = {};

if (fs.existsSync(SAVE_FILE)) {
  players = JSON.parse(fs.readFileSync(SAVE_FILE));
}

function saveGame() {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(players, null, 2));
}

// ================= DATA =================
const tiers = {
  T1: ["stone","iron","wood"],
  T2: ["aetherite","cobalt","frigidium"],
  T3: ["exorite","skynium","emberite"],
  T4: ["nullium","zaphrite","nanite"]
};

const enemies = {
  slime: {
    hp: 20,
    attacks: [
      { name: "water spit", dmg: 5 },
      { name: "body slam", dmg: 6 }
    ]
  },
  lizard: {
    hp: 30,
    attacks: [
      { name: "tail whip", dmg: 7 },
      { name: "bite", dmg: 8 }
    ]
  },
  "black serpent": {
    hp: 40,
    attacks: [
      { name: "poison bite", dmg: 10 },
      { name: "coil crush", dmg: 9 }
    ]
  }
};

const bosses = {
  "cave dweller": { hp: 300 },
  "paladin": { hp: 500 }
};

// ================= PLAYER =================
function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      hp: 100,
      gold: 100,

      stats: {
        strength: 5,
        agility: 5,
        intelligence: 1
      },

      inventory: {
        stone: 20,
        iron: 10
      },

      discoveredOres: ["stone"],

      training: {
        active: null,
        queue: []
      },

      combat: null,

      recipes: {},
      recipeXP: {},

      quests: [],
      completedQuests: []
    };
  }
  return players[id];
}

// ================= HELPERS =================
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

function generateRecipe(item, p) {
  let tier = getTier(p);
  let mats = tiers[tier];

  let req = {};

  for (let i = 0; i < 2; i++) {
    let m = mats[Math.floor(Math.random()*mats.length)];
    req[m] = Math.floor(Math.random()*5)+3;
  }

  if (tier !== "T1") req["core"] = 1;
  if (tier === "T4") req["reactor"] = 1;

  return req;
}

// ================= TRAINING =================
function processTraining(p) {
  if (!p.training.active && p.training.queue.length > 0) {
    let stat = p.training.queue.shift();

    p.training.active = {
      stat,
      start: Date.now(),
      duration: 60000
    };
  }

  if (p.training.active) {
    let t = p.training.active;

    if (Date.now() - t.start >= t.duration) {
      let gain = 1;
      if (p.stats[t.stat] > 50) gain = 0.5;
      if (p.stats[t.stat] > 100) gain = 0.2;

      p.stats[t.stat] += gain;
      p.training.active = null;

      return `${t.stat} training finished (+${gain})`;
    }
  }

  return null;
}

// ================= EXPLORE =================
function explore(p) {
  let roll = Math.random();

  if (roll < 0.25) {
    let tier = getTier(p);
    let ore = tiers[tier][Math.floor(Math.random()*tiers[tier].length)];

    if (!p.discoveredOres.includes(ore)) {
      p.discoveredOres.push(ore);
      return `New ore discovered: ${ore}`;
    }

    p.inventory[ore] = (p.inventory[ore] || 0) + 2;
    return `Found ${ore} x2`;
  }

  if (roll < 0.45) {
    let loot = ["bandage","energy drink","scrap"];
    let item = loot[Math.floor(Math.random()*loot.length)];

    p.inventory[item] = (p.inventory[item] || 0) + 1;
    return `Found ${item}`;
  }

  if (roll < 0.6) {
    return "You encountered a slime. Type 'fight'";
  }

  if (roll < 0.75) {
    let quest = "Collect 10 stone";
    p.quests.push(quest);
    return `New Quest: ${quest}`;
  }

  p.stats.intelligence += 1;
  return "You found ancient knowledge (+1 INT)";
}

// ================= CORE =================
function interpret(input, p) {
  input = input.toLowerCase();

  let done = processTraining(p);
  if (done) return done;

  // ===== COMBAT =====
  if (p.combat) {
    let c = p.combat;

    if (input === "attack") {
      let dmg = Math.floor((p.stats.strength * 1.2) + Math.random()*5);
      c.hp -= dmg;

      if (c.hp <= 0) {
        p.gold += 20;
        p.combat = null;
        return `You dealt ${dmg}. Enemy defeated (+20 gold)`;
      }

      let atk = c.data.attacks[Math.floor(Math.random()*c.data.attacks.length)];
      p.hp -= atk.dmg;

      return `You hit ${c.enemy} for ${dmg}
${c.enemy} used ${atk.name} (-${atk.dmg} HP)`;
    }

    if (input === "defend") {
      let atk = c.data.attacks[Math.floor(Math.random()*c.data.attacks.length)];
      let dmg = Math.floor(atk.dmg / 2);

      p.hp -= dmg;
      return `You defended. Took ${dmg}`;
    }

    if (input === "run") {
      p.combat = null;
      return "Escaped.";
    }

    return `Fighting ${c.enemy}
Type: attack / defend / run`;
  }

  // ===== TRAIN =====
  if (input.startsWith("train")) {
    let stat = input.split(" ")[1];
    if (!p.stats[stat]) return "Invalid stat";

    if (!p.training.active) {
      p.training.active = {
        stat,
        start: Date.now(),
        duration: 60000
      };
      return `Training ${stat} started`;
    }

    p.training.queue.push(stat);
    return `${stat} added to queue`;
  }

  // ===== EXPLORE =====
  if (input === "explore") return explore(p);

  // ===== FIGHT =====
  if (input === "fight") {
    let names = Object.keys(enemies);
    let name = names[Math.floor(Math.random()*names.length)];

    let e = JSON.parse(JSON.stringify(enemies[name]));

    p.combat = { enemy: name, hp: e.hp, data: e };

    return `${name} appeared. attack / defend / run`;
  }

  // ===== BOSS =====
  if (input.startsWith("boss")) {
    let name = input.replace("boss ","");
    let b = bosses[name];

    if (!b) return "Unknown boss";

    p.combat = {
      enemy: name,
      hp: b.hp,
      data: {
        attacks: [
          { name: "heavy strike", dmg: 15 },
          { name: "slam", dmg: 20 }
        ]
      }
    };

    return `${name} has appeared`;
  }

  // ===== CREATE =====
  if (input.startsWith("create")) {
    let item = input.replace("create ","");

    let recipe = generateRecipe(item, p);
    let rarity = getRarity(p);

    p.recipes[item] = { req: recipe, rarity };
    p.recipeXP[item] = 0;

    return `Created ${rarity} ${item}
${JSON.stringify(recipe,null,2)}`;
  }

  // ===== CRAFT =====
  if (input.startsWith("craft")) {
    let item = input.replace("craft ","");
    let r = p.recipes[item];

    if (!r) return "No recipe";

    for (let k in r.req) {
      if ((p.inventory[k]||0) < r.req[k]) return "Missing mats";
    }

    for (let k in r.req) {
      p.inventory[k] -= r.req[k];
    }

    p.recipeXP[item]++;
    return `Crafted ${item} (Mastery ${p.recipeXP[item]})`;
  }

  // ===== USE =====
  if (input.startsWith("use")) {
    let item = input.replace("use ","");

    if (!p.inventory[item]) return "You dont have that";

    if (item === "bandage") {
      p.hp += 10;
      p.inventory[item]--;
      return "Healed 10 HP";
    }

    return "Nothing happened";
  }

  if (input === "inventory") return JSON.stringify(p.inventory,null,2);
  if (input === "stats") return JSON.stringify(p.stats,null,2);
  if (input === "quests") return p.quests.join("\n") || "No quests";

  return `Early game tips:
- explore
- fight
- train strength
- create sword
- craft sword`;
}

// ================= ROUTES =================
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
app.listen(PORT,()=>console.log("Running on "+PORT));
