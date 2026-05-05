module.exports = {
    CLASSES: {
        "warrior": { hp: 150, mana: 50, str: 15, int: 5, spd: 8, def: 12 },
        "mage": { hp: 80, mana: 200, str: 5, int: 18, spd: 10, def: 5 },
        "rogue": { hp: 110, mana: 80, str: 10, int: 10, spd: 18, def: 8 }
    },
    EVOLUTION_TREE: {
        "human": { levelCap: 50, paths: ["Hero", "Demon Candidate"] },
        "Demon Candidate": { req: { souls: 10000 }, next: "True Demon Lord", bonus: { str: 2.0, unique_skill: "Beelzebub" } },
        "Hero": { req: { level: 50 }, next: "Chosen Champion", bonus: { def: 3.0, unique_skill: "Absolute Severance" } }
    },
    ZONES: {
        "spawn": { name: "The Shattered Tavern", mobs: ["rat"] },
        "wilds": { name: "Forgotten Woods", mobs: ["goblin", "slime", "wolf"] }
    }
};
