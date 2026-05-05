const express = require('express');
const cors = require('cors');
const state = require('./state');
const engine = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

// Main Command Route
app.post("/gate", (req, res) => {
    try {
        const { user, command } = req.body;
        if (!user) return res.status(400).json({ error: "Identify yourself." });

        // Auto-Initialize Player
        if (!state.players[user]) {
            state.players[user] = {
                name: user, level: 1, xp: 0, gold: 500,
                stats: { str: 10, def: 10, spd: 10, int: 10 },
                hp: 100, maxHp: 100, mana: 100, maxMana: 100,
                limitBreakStage: 0, pos: { x: 0, y: 0 },
                zone: "citrea", inventory: {}, equipment: { pickaxe: "starter" },
                f_durability: 500, task: null, talents: []
            };
        }

        const p = state.players[user];
        
        // Handle Background Tasks (Travel/Mining)
        if (p.task && Date.now() >= p.task.end) {
            const resData = p.task.result;
            if (resData.type === "move") { p.pos.x = resData.x; p.pos.y = resData.y; }
            if (resData.type === "item") { p.inventory[resData.name] = (p.inventory[resData.name] || 0) + 1; }
            p.task = null;
        }

        const output = engine.processCommand(command, p);
        res.json({ msg: output, player: p });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "The engine stalled in the dark." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 DARK RPG v1.0 ONLINE - Port ${PORT}`));
