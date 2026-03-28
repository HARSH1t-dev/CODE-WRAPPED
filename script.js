// ==========================================
// 1. STATE & SETUP
// ==========================================
console.log("Code Battle & Wrapped Matrix Loaded!");

let playerCount = 1;
let myCodeforcesTags = {}; // Stores tags specifically for Player 1
let chartInstance = null;  // Keeps track of the Chart.js instance

// ==========================================
// 2. EVENT LISTENERS
// ==========================================
document.getElementById('add-friend-btn').addEventListener('click', addFriendInput);
document.getElementById('fetch-btn').addEventListener('click', fetchAllStats);
document.getElementById('chart-card').addEventListener('click', renderPieChart);
document.getElementById('download-btn').addEventListener('click', downloadFlashcard);

// ==========================================
// 3. MAIN LOGIC
// ==========================================
function addFriendInput() {
    playerCount++;
    const container = document.getElementById('players-container');
    const newPlayerRow = document.createElement('div');
    newPlayerRow.className = 'input-group player-row';
    newPlayerRow.innerHTML = `
        <h3>Player ${playerCount}</h3>
        <input type="text" class="lc-input" placeholder="LeetCode Username">
        <input type="text" class="cf-input" placeholder="Codeforces Handle">
    `;
    container.appendChild(newPlayerRow);
}

async function fetchAllStats() {
    const errorBox = document.getElementById('error-message');
    const fetchBtn = document.getElementById('fetch-btn');
    errorBox.classList.add('hidden');
    
    const playerRows = document.querySelectorAll('.player-row');
    const players = [];

    // Gather input data
    playerRows.forEach((row, index) => {
        const lc = row.querySelector('.lc-input').value.trim();
        const cf = row.querySelector('.cf-input').value.trim();
        const name = cf || lc || `Player ${index + 1}`;
        if (lc || cf) {
            players.push({ id: index + 1, name, lc, cf, lcScore: 0, cfScore: 0, totalScore: 0 });
        }
    });

    if (players.length === 0) {
        showError("Please enter at least one player's handle.");
        return;
    }

    fetchBtn.textContent = "Simulating Battle...";
    fetchBtn.disabled = true;

    try {
        // Fetch data for all players concurrently
        for (let player of players) {
            let lcSolved = 0;
            let cfSolved = 0;

            if (player.lc) {
                try {
                    const lcData = await getLeetCodeStats(player.lc);
                    lcSolved = lcData.totalSolved || 0;
                } catch (e) { console.warn(`LC fail for ${player.lc}`); }
            }

            if (player.cf) {
                try {
                    // Pass true if this is Player 1 so we can grab their topic tags
                    const cfData = await getCodeforcesStats(player.cf, player.id === 1); 
                    cfSolved = cfData.totalSolved || 0;
                } catch (e) { console.warn(`CF fail for ${player.cf}`); }
            }

            player.lcScore = lcSolved;
            player.cfScore = cfSolved;
            player.totalScore = lcSolved + cfSolved;
        }

        populateMatrix(players);
    } catch (error) {
        showError("An error occurred while fetching data. Check console.");
        console.error(error);
    } finally {
        fetchBtn.textContent = "Generate Matrix";
        fetchBtn.disabled = false;
    }
}

// ==========================================
// 4. API FETCHERS
// ==========================================
async function getLeetCodeStats(username) {
    const apis = [
        `https://leetcode-stats-api.herokuapp.com/${username}`,
        `https://alfa-leetcode-api.onrender.com/${username}`
    ];
    for (const url of apis) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.totalSolved !== undefined) return data;
        } catch (e) { continue; }
    }
    throw new Error("All LeetCode APIs failed.");
}

async function getCodeforcesStats(handle, isPlayerOne) {
    const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
    const statusData = await statusRes.json();
    
    let totalSolved = 0;
    if (statusData.status === "OK") {
        const solved = new Set();
        statusData.result.forEach(sub => {
            if (sub.verdict === "OK") {
                const probId = `${sub.problem.contestId}${sub.problem.index}`;
                if (!solved.has(probId)) {
                    solved.add(probId);
                    
                    // Extract tags for the pie chart if this is Player 1
                    if (isPlayerOne && sub.problem.tags) {
                        sub.problem.tags.forEach(tag => {
                            myCodeforcesTags[tag] = (myCodeforcesTags[tag] || 0) + 1;
                        });
                    }
                }
            }
        });
        totalSolved = solved.size;
    }
    return { totalSolved };
}

// ==========================================
// 5. UI UPDATERS
// ==========================================
function showError(message) {
    const box = document.getElementById('error-message');
    box.innerHTML
