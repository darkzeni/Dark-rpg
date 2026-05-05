module.exports = {
    CAPS: [20, 40, 60, 80, 100],
    
    // Tiered progression with Hardness (H) and F-Durability requirements
    ORE_TIERS: {
        "copper": { h: 5, t: "T1", pick: "starter", xp: 10 },
        "iron": { h: 12, t: "T1", pick: "starter", xp: 25 },
        "stellarite": { h: 25, t: "T1", pick: "starter", xp: 60 },
        "cobalt": { h: 40, t: "T2", pick: "stellarite pickaxe", xp: 150 },
        "impure zaphrite": { h: 80, t: "T2", pick: "stellarite pickaxe", xp: 350 },
        "true stellarite": { h: 150, t: "T3", pick: "impure zaphrite pickaxe", xp: 800 },
        "solstice": { h: 300, t: "T4", pick: "true stellarite pickaxe", xp: 2000 },
        "benevolent ore": { h: 1000, t: "T5", pick: "solstice pickaxe", xp: 10000 }
    },

    // Detailed Magic System
    SPELLS: {
        "flare": { mana: 15, dmg: 2, element: "fire", reqInt: 5 },
        "fireball": { mana: 40, dmg: 5, element: "fire", reqInt: 15 },
        "void_rip": { mana: 100, dmg: 12, element: "shadow", reqInt: 50 },
        "solar_flare": { mana: 250, dmg: 35, element: "fire", reqInt: 80 },
        "abyssal_reach": { mana: 500, dmg: 80, element: "shadow", reqInt: 120 }
    },

    ZONE_MODIFIERS: {
        "citrea": { fire: 1.0, water: 1.0, shadow: 1.0, regen: 2.0, pvp: false },
        "plains": { fire: 1.0, water: 1.0, shadow: 1.0, regen: 1.0, pvp: true },
        "desert": { fire: 1.8, water: 0.4, shadow: 0.8, regen: 0.8, pvp: true },
        "hollows": { fire: 0.5, water: 1.2, shadow: 2.0, regen: 0.5, pvp: true },
        "ancient_ruins": { fire: 1.0, water: 1.0, shadow: 1.5, regen: 0.2, pvp: true }
    }
};
