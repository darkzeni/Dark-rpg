// engine.js - The Logic Processor
const data = require('./data');
const state = require('./state');

module.exports = {
    processCommand: function(input, p) {
        const args = input.toLowerCase().trim().split(" ");
        const cmd = args[0];
        const now = Date.now();

        // 1. LIMIT BREAK LOGIC
        if (cmd === "limitbreak") {
            const targetCap = data.CAPS[p.limitBreakStage];
            if (!targetCap) return "❌ Ultimate Limit reached for S1.";
            
            const statsAtCap = Object.values(p.stats).filter(v => v >= targetCap).length;
            if (statsAtCap < 3) return `❌ Need 3 stats at ${targetCap}.`;

            p.limitBreakStage++;
            p.maxMana += 100;
            const tKeys = Object.keys(data.TALENTS);
            const talent = tKeys[Math.floor(Math.random() * tKeys.length)];
            p.talents.push(talent);
            return `💥 Limit Broken! Cap is now ${data.CAPS[p.limitBreakStage] || 'MAX'}. Gained: ${talent}`;
        }

        // 2. ECONOMY
        if (cmd === "market" || cmd === "list" || cmd === "buy") {
            // ... (Insert runEconomyCommand logic here using state.auctionHouse)
            return "Economy processed.";
        }

        // 3. RAIDING
        if (cmd === "raid") {
            const raid = state.world.activeRaids["hollows_gate"];
            if (p.pos.x !== raid.coords.x || p.pos.y !== raid.coords.y) return "Too far!";
            const dmg = p.stats.str + (p.stats.int * 0.5);
            raid.hp -= dmg;
            if (raid.hp <= 0) {
                state.world.bossesDefeated.push(raid.name);
                raid.hp = raid.maxHp;
                return "Boss Slain! Gates opened!";
            }
            return `Hit ${raid.name} for ${dmg}.`;
        }

        // 4. REFINEMENT
        if (cmd === "refine") {
            const ore = args[1];
            const cost = data.REFINEMENT_COSTS[ore];
            if (!cost || p.inventory[ore] < 5 || p.gold < cost.gold) return "Cannot refine.";
            p.inventory[ore] -= 5;
            p.gold -= cost.gold;
            p.f_durability += cost.f_boost;
            return `Success! +${cost.f_boost}F Durability.`;
        }

        return "Command received.";
    }
};

