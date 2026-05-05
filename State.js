module.exports = {
    players: {}, 
    world: {
        startTime: Date.now(),
        bossesDefeated: [], 
        activeRaids: {
            "gatekeeper": { 
                hp: 50000, maxHp: 50000, 
                coords: { x: 150, y: 150 }, 
                status: "alive",
                lastDeath: null 
            }
        },
        globalGates: { hollows: false, ruins: false }
    },
    auctionHouse: [],
    bounties: {},
    chatLog: []
};
