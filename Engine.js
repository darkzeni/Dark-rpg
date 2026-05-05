const data = require('./data');
const state = require('./state');

module.exports = {
    processCommand: function(input, p) {
        if (!input) return "The void is silent.";
        const args = input.toLowerCase().trim().split(" ");
        const cmd = args[0];
        const now = Date.now();

        // 1. STATS & STATUS
        if (cmd === "stats") {
            return `--- ${p.name} [Lvl ${p.level}] ---\n` +
                   `STR: ${p.stats.str} | DEF: ${p.stats.def} | SPD: ${p.stats.spd} | INT: ${p.stats.int}\n` +
                   `HP: ${p.hp}/${p.maxHp} | Mana: ${p.mana}/${p.maxMana}\n` +
                   `F-Durability: ${p.f_durability} | Stage: ${p.limitBreakStage}\n` +
                   `Pos: (${p.pos.x}, ${p.pos.y}) | Zone: ${p.zone}`;
        }

        // 2. STAGED LIMIT BREAK (The 20-100 Gate)
        if (cmd === "limitbreak") {
            const currentCap = data.CAPS[p.limitBreakStage];
            if (!currentCap) return "You have ascended past Season 1 limits.";

            const statsAtCap = Object.entries(p.stats).filter(([k, v]) => v >= currentCap).length;
            if (statsAtCap < 3) return `❌ The gate is barred. You need 3 stats at ${currentCap}. (Current: ${statsAtCap}/3)`;

            if (p.gold < (p.limitBreakStage + 1) * 1000) return "❌ Not enough gold for the ritual.";

            p.gold -= (p.limitBreakStage + 1) * 1000;
            p.limitBreakStage++;
            p.maxMana += 150;
            return `💥 SHATTERED! The ${currentCap} limit is gone. Your mana swells.`;
        }

        // 3. ADVANCED COMBAT (PvP & PvE)
        if (cmd === "attack" || cmd === "cast") {
            const targetName = args[1];
            const target = Object.values(state.players).find(u => u.name === targetName);
            
            if (!target) return "Target not found in the mists.";
            if (target.pos.x !== p.pos.x || target.pos.y !== p.pos.y) return "Target is too far away.";

            let rawDmg = 0;
            if (cmd === "attack") {
                rawDmg = p.stats.str * 1.5;
            } else {
                const spell = data.SPELLS[args[2]];
                if (!spell) return "Unknown spell.";
                if (p.mana < spell.mana) return "Mana depleted.";
                p.mana -= spell.mana;
                const mod = data.ZONE_MODIFIERS[p.zone][spell.element] || 1;
                rawDmg = (p.stats.int * spell.dmg) * mod;
            }

            const finalDmg = Math.max(1, rawDmg - (target.stats.def * 0.8));
            target.hp -= finalDmg;

            if (target.hp <= 0) {
                target.hp = 20; // Respawn HP
                target.pos = { x: 0, y: 0 };
                // Bounty Logic
                if (state.bounties[target.name]) {
                    p.gold += state.bounties[target.name];
                    delete state.bounties[target.name];
                    return `💀 SLAYER! You claimed the bounty on ${target.name}!`;
                }
                return `⚔️ You cut down ${target.name}. They vanish back to spawn.`;
            }
            return `⚔️ Dealt ${Math.floor(finalDmg)} damage to ${target.name}.`;
        }

        // 4. COORDINATE TRAVEL
        if (cmd === "travel") {
            const tx = parseInt(args[1]), ty = parseInt(args[2]);
            if (isNaN(tx) || isNaN(ty)) return "Travel where? (travel x y)";
            
            const dist = Math.sqrt(Math.pow(tx - p.pos.x, 2) + Math.pow(ty - p.pos.y, 2));
            const travelTime = (dist * 1000) / (1 + p.stats.spd / 25);
            
            p.task = { action: "travelling", end: now + travelTime, result: { type: "move", x: tx, y: ty } };
            return `🏃 Journeying to (${tx}, ${ty})... [${Math.ceil(travelTime/1000)}s]`;
        }

        return "The darkness swallows your command.";
    }
};
