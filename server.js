// server.js - The Server Entry
const express = require('express');
const state = require('./state');
const engine = require('./engine');
const app = express();
app.use(express.json());

function getPlayer(id) {
    if (!state.players[id]) {
        state.players[id] = {
            name: id, level: 1, xp: 0, gold: 500,
            stats: { str: 5, def: 5, spd: 5, int: 5 },
            limitBreakStage: 0, talents: [],
            pos: { x: 0, y: 0 }, inventory: {},
            f_durability: 500, maxMana: 100
        };
    }
    return state.players[id];
}

app.post("/command", (req, res) => {
    const p = getPlayer(req.body.user);
    const result = engine.processCommand(req.body.command, p);
    
    // Hardmode XP Scaling: Level^2.5 * 150
    const nextLevelXp = Math.pow(p.level, 2.5) * 150;
    if (p.xp >= nextLevelXp) {
        p.level++;
        // Trigger Level Up logic
    }
    
    res.json({ msg: result, player: p });
});

app.listen(3000, () => console.log("Hardmode Season 1 Engine Online on Port 3000"));

