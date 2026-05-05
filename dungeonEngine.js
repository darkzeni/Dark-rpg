module.exports = {
    createDungeon: function(level, type) {
        const size = 5 + Math.floor(level / 10);
        let grid = [];
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                // Generate a random room type
                const rand = Math.random();
                let event = "empty";
                if (rand > 0.8) event = "monster";
                if (rand > 0.95) event = "treasure";
                grid.push({ x, y, event, cleared: false });
            }
        }
        return {
            rooms: grid,
            bossLoc: { x: size - 1, y: size - 1 },
            difficulty: level
        };
    }
};

