// state.js - The World's Memory
module.exports = {
    players: {}, 
    world: {
        bossesDefeated: [], 
        activeRaids: {
            "hollows_gate": {
                name: "Gatekeeper Malcor",
                hp: 50000,
                maxHp: 50000,
                coords: { x: 150, y: 150 },
                drops: ["essence of advancement", "void shard"]
            }
        }
    },
    auctionHouse: [],
    bounties: {}
};

