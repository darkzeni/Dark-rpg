// data.js - The RPG Database
module.exports = {
    CAPS: [20, 40, 60, 80, 100],
    
    ORE_TIERS: {
        "copper": { h: 5, t: "T1", pick: "starter" },
        "iron": { h: 10, t: "T1", pick: "starter" },
        "stellarite": { h: 20, t: "T1", pick: "starter" },
        "cobalt": { h: 15, t: "T2", pick: "stellarite pickaxe" },
        "impure zaphrite": { h: 45, t: "T2", pick: "stellarite pickaxe" },
        "true stellarite": { h: 70, t: "T3", pick: "impure zaphrite pickaxe" }
    },

    ZONE_MODIFIERS: {
        "desert": { fire: 1.5, water: 0.5, earth: 1.2 },
        "plains": { fire: 1.0, water: 1.0, earth: 1.0 },
        "hollows": { fire: 0.7, shadow: 1.8, earth: 1.5 },
        "citrea": { holy: 2.0, mana_regen: 1.5 }
    },

    TALENTS: {
        "Pyromaniac": { req: "int", desc: "Fire spells have a 20% chance to reset cooldown." },
        "Juggernaut": { req: "def", desc: "Gain +1,000 Max HP but lose 10% Speed." },
        "Wind Walker": { req: "spd", desc: "Exploration/Travel times reduced by 15%." },
        "Mana Well": { req: "mana", desc: "Mana regenerates in combat." }
    },

    PATHS: {
        "pyromancer": { bonus: "int", spells: ["fireball", "inferno"] },
        "sentinel": { bonus: "def", spells: ["iron skin", "shield bash"] },
        "wraith": { bonus: "spd", spells: ["shadow step", "void strike"] }
    },

    REFINEMENT_COSTS: {
        "iron": { f_boost: 500, gold: 200 },
        "stellarite": { f_boost: 2000, gold: 1000 },
        "zaphrite": { f_boost: 15000, gold: 10000 }
    }
};

