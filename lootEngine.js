const data = require('./data');

const PREFIXES = [
    { name: "Rusty", mult: 0.5, rarity: "Common" },
    { name: "Sharp", mult: 1.2, rarity: "Uncommon" },
    { name: "God-Slaying", mult: 5.0, rarity: "Mythic" },
    { name: "Void-Touched", mult: 10.0, rarity: "Genesis" }
];

const SUFFIXES = [
    { name: "of the Bear", stat: "str", bonus: 5 },
    { name: "of the Phoenix", stat: "hp_regen", bonus: 20 },
    { name: "of Eternal Void", stat: "all", bonus: 50 }
];

module.exports = {
    generateLoot: function(level) {
        const pre = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
        const suf = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
        const baseAtk = level * 5;

        // THE BALANCE AI: Ensures items don't break the game too early
        let finalAtk = baseAtk * pre.mult;
        const powerScore = finalAtk + (suf.bonus * 2);
        
        // If it's too powerful for the level, add a 'Cursed' tag to balance it
        let name = `${pre.name} Sword ${suf.name}`;
        if (powerScore > level * 50) {
            name = "Cursed " + name;
            finalAtk *= 0.8; 
        }

        return {
            name: name,
            atk: Math.floor(finalAtk),
            rarity: pre.rarity,
            stats: suf.stat,
            bonus: suf.bonus,
            value: Math.floor(powerScore * 10)
        };
    }
};
