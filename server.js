const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// =========================
// DATABASE (BETA MEMORY)
// =========================
let players = {};

// =========================
// ITEM SYSTEM (DATA DRIVEN)
// =========================
const items = {
  stone: { type: "material" },
  iron: { type: "material" },

  "stone sword": {
    type: "weapon",
    req: { stone: 10 }
  },

  "iron blade": {
    type: "weapon",
    req: { iron: 15, stone: 5 }
  }
};

// =========================
// HAX SYSTEM (EXPANDABLE)
// =========================
const hax = {
  "speed burst": {
    tier: "F",
    cost: 5,
    effect: "speed + small boost"
  },

  "iron guard": {
    tier: "F",
    cost: 6,
    effect: "slight damage reduction"
  },

  "energy strike": {
    tier: "E",
    cost: 10,
    effect: "bonus damage"
  }
};

// =========================
// PLAYER INIT
// =========================
function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      stats: {
        strength: 1,
        agility: 1,
        stamina: 10
      },
      inventory: {
        stone: 20,
        iron: 10
      },
      hax: ["speed burst"],
      cooldowns: {}
    };
  }
  return players[id];
}

// =========================
// COMMAND ENGINE
// =========================
app.post("/command", (req, res) => {
  const { user, command } = req.body;
  const p = getPlayer(user);
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
  let msg = "";

  const args = command.toLowerCase().split(" ");
  const base = args[0];

  // -------------------------
  // TRAIN SYSTEM
  // -------------------------
  if (base === "train") {
    let stat = args[1];

    if (!p.stats[stat]) {
      msg = "Unknown stat";
    } else {
      p.stats[stat] += 1;
      msg = `${stat} increased to ${p.stats[stat]}`;
    }
  }

  // -------------------------
  // INVENTORY
  // -------------------------
  else if (base === "inventory") {
    msg = JSON.stringify(p.inventory, null, 2);
  }

  // -------------------------
  // LEADERBOARD (simple for now)
  // -------------------------
  else if (base === "leaderboard") {
    let board = Object.entries(players)
      .sort((a, b) => b[1].stats.strength - a[1].stats.strength)
      .map(([name, data]) => `${name}: STR ${data.stats.strength}`)
      .join("\n");

    msg = board || "No players";
  }

  // -------------------------
  // CRAFTING SYSTEM
  // -------------------------
  else if (base === "craft") {
    let itemName = command.replace("craft ", "");

    let item = items[itemName];
    if (!item || !item.req) {
      msg = "Invalid recipe";
    } else {
      let canCraft = true;

      for (let r in item.req) {
        if ((p.inventory[r] || 0) < item.req[r]) {
          canCraft = false;
          msg = "Missing materials";
        }
      }

      if (canCraft) {
        for (let r in item.req) {
          p.inventory[r] -= item.req[r];
        }

        p.inventory[itemName] = (p.inventory[itemName] || 0) + 1;
        msg = `Crafted ${itemName}`;
      }
    }
  }

  // -------------------------
  // HAX SYSTEM
  // -------------------------
  else if (base === "hax") {
    msg = "Hax: " + p.hax.join(", ");
  }

  else if (base === "use") {
    let name = command.replace("use ", "");
    let ability = hax[name];

    if (!ability) {
      msg = "Unknown hax";
    } else if (!p.hax.includes(name)) {
      msg = "You don't own this hax";
    } else {
      msg = `Used ${name}: ${ability.effect}`;
    }
  }

  else {
    msg = "Unknown command";
  }

  res.json({ msg });
});

// =========================
app.listen(3000, () => {
  console.log("RPG running on port 3000");
});
