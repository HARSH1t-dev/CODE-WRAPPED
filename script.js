console.log("Minimalist Code Battle Loaded!");

let playerCount = 1;
let myCodeforcesTags = {}; 
let chartInstance = null;  

document.getElementById('add-friend-btn').addEventListener('click', addFriendInput);
document.getElementById('fetch-btn').addEventListener('click', fetchAllStats);
document.getElementById('chart-card').addEventListener('click', renderPieChart);
document.getElementById('download-btn').addEventListener('click', downloadFlashcard);

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

    playerRows.forEach((row, index) => {
        const lc = row.querySelector('.lc-input').value.trim();
        const cf = row.querySelector('.cf-input').value.trim();
        const name = cf || lc || `Player ${index + 1}`;
        if (lc || cf) {
            players.push({ id: index + 1, name, lc, cf, lcScore: 0, cfScore: 0, totalScore: 0 });
        }
    });

    if (players.length === 0) {
        showError("Please enter at least one handle.");
        return;
    }

    fetchBtn.textContent = "Simulating Battle...";
    fetchBtn.disabled = true;

    try {
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

            player.lcScore = lcSolved;
            player.cfScore = cfSolved;
            player.totalScore = lcSolved + cfSolved;
        }
        populateMatrix(players);
    } catch (error) {
        showError("An error occurred while fetching data.");
    } finally {
        fetchBtn.textContent = "Simulate Battle";
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

    const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);

    // 1. Set the Champion with Aura++
    const champion = sortedPlayers[0];
    document.getElementById('winner-name').textContent = `${champion.name} `;
    document.getElementById('winner-score').textContent = `${champion.totalScore} Total`;

    // 2. Populate Leaderboard
    const listElement = document.getElementById('leaderboard-list');
    listElement.innerHTML = '';
    sortedPlayers.forEach((p) => {
        const li = document.createElement('li');
        // Add Aura++ indicator to the leaderboard as well
        const displayName = p.id === champion.id ? `${p.name} ` : p.name;
        li.textContent = `${displayName}: ${p.totalScore} pts`;
        listElement.appendChild(li);
    });
    
    document.getElementById('chart-container').classList.add('hidden');
    document.querySelector('.click-hint').style.display = 'block';

    // 3. Shareable Flashcard
    const you = players.find(p => p.id === 1);
    if (you) {
        let exportDisplayName = you.name.toUpperCase();
        // If Player 1 is the Champion, they get Aura++ on their card
        if (champion.id === 1) {
            exportDisplayName += " (AURA++)";
        }
        
        document.getElementById('export-name').textContent = exportDisplayName;
        document.getElementById('export-lc').textContent = you.lcScore;
        document.getElementById('export-cf').textContent = you.cfScore;
        document.getElementById('export-total').textContent = you.totalScore;
    }
}

function renderPieChart() {
    const container = document.getElementById('chart-container');
    const hint = document.querySelector('.click-hint');
    if (!container.classList.contains('hidden')) return; 
    
    const tags = Object.keys(myCodeforcesTags);
    if (tags.length === 0) return;

    container.classList.remove('hidden');
    hint.style.display = 'none';

    const sortedTags = tags.sort((a, b) => myCodeforcesTags[b] - myCodeforcesTags[a]).slice(0, 6);
    const dataValues = sortedTags.map(tag => myCodeforcesTags[tag]);

    const ctx = document.getElementById('topicChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedTags,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: 'white', font: { family: 'Inter' } } } }
        }
    });
}

// Fixed & Bulletproof Download Function
function downloadFlashcard() {
    const card = document.getElementById('export-card');
    const btn = document.getElementById('download-btn');
    
    if (!card || typeof html2canvas === 'undefined') {
        alert("Library error. Please refresh and try again.");
        return;
    }

    btn.textContent = "Generating...";
    btn.disabled = true;

    // Small delay ensures DOM and CSS are fully painted before capturing
    setTimeout(() => {
        html2canvas(card, {
            scale: 2, 
            backgroundColor: "#0a0a0a", // Matches the minimal backdrop
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.download = 'Code-Wrapped-Arena.png';
            link.href = image;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            btn.textContent = "⬇ Download Flashcard";
            btn.disabled = false;
        }).catch(err => {
            console.error("Canvas Error:", err);
            btn.textContent = "Error! Try Again.";
            btn.disabled = false;
        });
    }, 300);
}
