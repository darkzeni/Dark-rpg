const express = require('express');
const cors = require('cors');
const state = require('./state');
const engine = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

function getPlayer(id) {
    if (!state.players[id]) {
        state.players[id] = {
            name: id,
            level: 1,
            xp: 0,
            gold: 100,
            stats: { str: 10, def: 10, spd: 10, int: 10 },
            limitBreakStage: 0,
            talents: [],
            pos: { x: 0, y: 0 },
            inventory: {},
            equipment: { pickaxe: "starter" },
            f_durability: 500,
            maxMana: 100,
            task: null
        };
    }
    return state.players[id];
}

app.post("/command", (req, res) => {
    const { user, command } = req.body;
    const p = getPlayer(user || "Wanderer");
    const result = engine.processCommand(command, p);
    
    // XP Scaling
    const nextLevelXp = Math.floor(Math.pow(p.level, 2.5) * 150);
    if (p.xp >= nextLevelXp) {
        p.level++;
    }
    
    res.json({ msg: result, player: p });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Engine active for Dark RPG on port ${PORT}`));
