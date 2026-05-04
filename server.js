// KEEP YOUR IMPORTS SAME
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

// ================= ITEMS =================
const itemsData = {
  "iron sword": { type: "weapon", dmg: 5 },
  "stone sword": { type: "weapon", dmg: 2 },
  "iron armour": { type: "armor", def: 5 },
  "bandage": { type: "consumable" }
};

// ================= ENEMIES =================
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
  }
};

// ================= PLAYER =================
function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      name: id,

      hp: 100,
      maxHp: 100,

      stats: {
        strength: 5,
        defense: 2,
        stamina: 5
      },

      inventory: {
        stone: 20,
        iron: 10,
        bandage: 2
      },

      equipment: {
        weapon: null,
        armor: null
      },

      abilities: ["punch"],

      cooldowns: {},

      combat: null,

      memory: []
    };
  }
  return players[id];
}

// ================= APPLY EQUIP =================
function applyStats(p) {
  let baseStr = 5;
  let baseDef = 2;

  if (p.equipment.weapon) {
    let w = itemsData[p.equipment.weapon];
    if (w) baseStr += w.dmg;
  }

  if (p.equipment.armor) {
    let a = itemsData[p.equipment.armor];
    if (a) baseDef += a.def;
  }

  p.stats.strength = baseStr;
  p.stats.defense = baseDef;
}

// ================= EXPLORE =================
function explore(p) {
  let roll = Math.random();

  if (roll < 0.2) {
    return "You found an abandoned camp. Nothing useful... yet.";
  }

  if (roll < 0.4) {
    p.inventory.stone += 2;
    return "You gathered stone x2";
  }

  if (roll < 0.6) {
    return "A slime is nearby. Type 'fight'";
  }

  if (roll < 0.8) {
    p.stats.stamina += 1;
    return "You feel more energetic. Stamina +1";
  }

  return "You feel like you're being watched...";
}

// ================= ABILITIES =================
function useAbility(name, p, enemy) {
  if (name === "punch") {
    return { dmg: p.stats.strength };
  }

  if (name === "kick") {
    return { dmg: p.stats.strength + 2 };
  }

  return null;
}

// ================= CORE =================
function interpret(input, p) {
  input = input.toLowerCase();

  applyStats(p);

  p.memory.push(input);

  // ===== COMBAT =====
  if (p.combat) {
    let c = p.combat;

    if (input.startsWith("use")) {
      let ability = input.replace("use ","");

      let res = useAbility(ability, p, c);
      if (!res) return "Unknown ability";

      c.hp -= res.dmg;

      if (c.hp <= 0) {
        p.combat = null;
        return `You used ${ability} and won`;
      }

      let atk = c.data.attacks[Math.floor(Math.random()*c.data.attacks.length)];
      let dmg = Math.max(0, atk.dmg - p.stats.defense);

      p.hp -= dmg;

      return `You used ${ability} (${res.dmg})
Enemy used ${atk.name} (${dmg})`;
    }

    if (input === "run") {
      p.combat = null;
      return "Escaped";
    }

    return "Use abilities: use punch / run";
  }

  // ===== NAME =====
  if (input.startsWith("name")) {
    let n = input.replace("name ","");
    players[n] = p;
    delete players[p.name];
    p.name = n;
    return "Name updated";
  }

  // ===== FIGHT =====
  if (input === "fight") {
    let names = Object.keys(enemies);
    let name = names[Math.floor(Math.random()*names.length)];
    let e = JSON.parse(JSON.stringify(enemies[name]));

    p.combat = { enemy: name, hp: e.hp, data: e };

    return `${name} appeared. use punch`;
  }

  // ===== EQUIP =====
  if (input.startsWith("equip")) {
    let item = input.replace("equip ","");

    if (!p.inventory[item]) return "Dont have item";

    let data = itemsData[item];
    if (!data) return "Cant equip";

    if (data.type === "weapon") p.equipment.weapon = item;
    if (data.type === "armor") p.equipment.armor = item;

    return `Equipped ${item}`;
  }

  // ===== USE ITEM =====
  if (input.startsWith("use item")) {
    let item = input.replace("use item ","");

    if (!p.inventory[item]) return "No item";

    if (item === "bandage") {
      p.hp = Math.min(p.maxHp, p.hp + 10);
      p.inventory[item]--;
      return "Healed";
    }
  }

  // ===== EXPLORE =====
  if (input === "explore") return explore(p);

  // ===== CREATE =====
  if (input.startsWith("create")) {
    let item = input.replace("create ","");
    p.inventory[item] = 1;
    return `Created ${item}`;
  }

  if (input === "inventory") {
    return `
Inventory:
${JSON.stringify(p.inventory,null,2)}

Equipped:
${JSON.stringify(p.equipment,null,2)}
`;
  }

  if (input === "stats") {
    return JSON.stringify(p.stats,null,2);
  }

  return `
You're early game.

Try:
- explore
- fight
- use punch
- create iron sword
- equip iron sword
`;
}

// ================= ROUTES =================
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

app.post("/command",(req,res)=>{
  const {user,command} = req.body;

  let p = getPlayer(user || "guest");

  let msg = interpret(command, p);

  saveGame();

  res.json({msg, player:p});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("Running"));
