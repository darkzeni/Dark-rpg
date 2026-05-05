const data = require('./data');
const state = require('./state');

module.exports = {
    processCommand: function(input, p) {
        if (!input) return "The void awaits your command.";
        const args = input.toLowerCase().trim().split(" ");
        const cmd = args[0];
        const now = Date.now();

        // Mining logic with the "H" (Hardness) system
        if (cmd === "mine") {
            const ore = args.slice(1).join(" ");
            const info = data.ORE_TIERS[ore];
            if (!info) return "That ore doesn't exist here.";
            if (p.equipment.pickaxe !== info.pick && info.t !== "T1") return `You need a ${info.pick}!`;

            const time = (info.h * 1000) / (1 + p.stats.spd / 50);
            p.task = { action: `mining ${ore}`, end: now + time, result: { type: "item", name: ore } };
            return `⛏️ You start mining ${ore}... (${Math.ceil(time/1000)}s)`;
        }

        // Limit Break Logic (Requires 3 stats at cap)
        if (cmd === "limitbreak") {
            const cap = data.CAPS[p.limitBreakStage];
            if (!cap) return "Ultimate limit reached.";
            const atCap = Object.values(p.stats).filter(v => v >= cap).length;
            if (atCap < 3) return `Need 3 stats at ${cap}.`;
            p.limitBreakStage++;
            return "💥 Limit Broken!";
        }

        return "Unknown command.";
    }
};
