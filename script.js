let playerCount = 1;
let myCodeforcesTags = {}; // Store Player 1's CF tags for the pie chart
let chartInstance = null;

document.getElementById('add-friend-btn').addEventListener('click', () => {
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
});

document.getElementById('fetch-btn').addEventListener('click', fetchAllStats);

// Show chart when clicking the Chart Card
document.getElementById('chart-card').addEventListener('click', renderPieChart);

async function fetchAllStats() {
    const errorBox = document.getElementById('error-message');
    const fetchBtn = document.getElementById('fetch-btn');
    errorBox.classList.add('hidden');
    
    // Gather all player inputs
    const playerRows = document.querySelectorAll('.player-row');
    const players = [];

    playerRows.forEach((row, index) => {
        const lc = row.querySelector('.lc-input').value.trim();
        const cf = row.querySelector('.cf-input').value.trim();
        // Give them a default name if fields are empty to avoid errors
        const name = cf || lc || `Player ${index + 1}`;
        if (lc || cf) {
            players.push({ id: index + 1, name, lc, cf, totalScore: 0 });
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
                    const cfData = await getCodeforcesStats(player.cf, player.id === 1); 
                    cfSolved = cfData.totalSolved || 0;
                } catch (e) { console.warn(`CF fail for ${player.cf}`); }
            }

            player.totalScore = lcSolved + cfSolved;
        }

        populateMatrix(players);
    } catch (error) {
        showError("An error occurred while fetching data.");
    } finally {
        fetchBtn.textContent = "Generate Matrix";
        fetchBtn.disabled = false;
    }
}

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
    throw new Error("LeetCode API failed.");
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
                    
                    // If this is Player 1 (You), count the tags for the Pie Chart
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

function showError(message) {
    const box = document.getElementById('error-message');
    box.innerHTML = message;
    box.classList.remove('hidden');
}

function populateMatrix(players) {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('matrix-container').classList.remove('hidden');

    // Sort players by total score descending
    players.sort((a, b) => b.totalScore - a.totalScore);

    // 1. Set The Champion
    const champion = players[0];
    document.getElementById('winner-name').textContent = champion.name;
    document.getElementById('winner-score').textContent = `${champion.totalScore} Total`;

    // 2. Populate Leaderboard List
    const listElement = document.getElementById('leaderboard-list');
    listElement.innerHTML = '';
    players.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `${p.name}: ${p.totalScore} pts`;
        listElement.appendChild(li);
    });
    
    // Reset Pie chart state
    document.getElementById('chart-container').classList.add('hidden');
    document.querySelector('.click-hint').style.display = 'block';
}

function renderPieChart() {
    const container = document.getElementById('chart-container');
    const hint = document.querySelector('.click-hint');
    
    // Only render if it's currently hidden and we have data
    if (!container.classList.contains('hidden')) return; 
    
    const tags = Object.keys(myCodeforcesTags);
    if (tags.length === 0) {
        alert("No Codeforces tag data found for Player 1.");
        return;
    }

    container.classList.remove('hidden');
    hint.style.display = 'none';

    // Sort tags to only show top 6 to keep the chart clean
    const sortedTags = tags.sort((a, b) => myCodeforcesTags[b] - myCodeforcesTags[a]).slice(0, 6);
    const dataValues = sortedTags.map(tag => myCodeforcesTags[tag]);

    const ctx = document.getElementById('topicChart').getContext('2d');
    
    // Destroy previous chart if it exists to prevent glitching
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedTags,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: 'white', font: { family: 'Inter' } } }
            }
        }
    });
}
