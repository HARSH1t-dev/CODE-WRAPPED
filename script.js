console.log("Code Battle Arena Loaded!");

let playerCount = 1;
let myCodeforcesTags = {}; 
let chartInstance = null;  

// Define color palette for avatars
const avatarPalette = [
    '#58a6ff', // Cyan
    '#2ea44f', // Green
    '#f85149', // Red
    '#d299ff', // Purple
    '#f0883e', // Orange
    '#ffce56'  // Yellow
];

document.getElementById('add-friend-btn').addEventListener('click', addFriendInput);
document.getElementById('fetch-btn').addEventListener('click', fetchAllStats);
document.getElementById('chart-card').addEventListener('click', renderPieChart);
document.getElementById('download-btn').addEventListener('click', downloadFlashcard);

function addFriendInput() {
    if(playerCount >= 6) {
        alert("Max 6 players allowed for a clean chart!");
        return;
    }
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
    
    // Reset tags
    myCodeforcesTags = {};
    
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
                } catch (e) { 
                    console.warn(`LC fail for ${player.lc}`, e); 
                }
            }

            if (player.cf) {
                try {
                    // Only track tags for Player 1 (index 0 in DOM, id 1)
                    const isPlayerOne = (player.id === 1);
                    const cfData = await getCodeforcesStats(player.cf, isPlayerOne); 
                    cfSolved = cfData.totalSolved || 0;
                } catch (e) { 
                    console.warn(`CF fail for ${player.cf}`, e); 
                }
            }

            player.lcScore = lcSolved;
            player.cfScore = cfSolved;
            player.totalScore = lcSolved + cfSolved;
        }
        
        populateMatrix(players);
    } catch (error) {
        console.error(error);
        showError("An error occurred while rendering the data. Check console for details.");
    } finally {
        fetchBtn.textContent = "Simulate Battle";
        fetchBtn.disabled = false;
    }
}

// 🚀 UPGRADED: Fallback Mechanism for LeetCode APIs
async function getLeetCodeStats(username) {
    const apis = [
        {
            url: `https://leetcode-stats-api.herokuapp.com/${username}`,
            extract: (data) => data.totalSolved
        },
        {
            url: `https://alfa-leetcode-api.onrender.com/${username}/solved`,
            extract: (data) => data.solvedProblem
        },
        {
            url: `https://leetcode-api-faisalshohag.vercel.app/${username}`,
            extract: (data) => data.totalSolved
        }
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api.url);
            if (!response.ok) continue;
            
            const data = await response.json();
            
            // Check for API-specific error responses (like user not found)
            if (data.status === "error" || data.errors) {
                console.warn(`User not found or error on ${api.url}`);
                continue; 
            }

            const solved = api.extract(data);
            if (solved !== undefined && solved !== null) {
                return { totalSolved: solved };
            }
        } catch (e) { 
            console.warn(`Failed fetching from ${api.url}, trying next fallback...`); 
        }
    }
    throw new Error(`All LeetCode APIs failed or timed out for user: ${username}`);
}

// 🚀 UPGRADED: Added robust error handling for Codeforces API
async function getCodeforcesStats(handle, isPlayerOne) {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
    
    if (!response.ok) {
        throw new Error(`Codeforces API Error: HTTP ${response.status}`);
    }

    const statusData = await response.json();
    
    let totalSolved = 0;
    if (statusData.status === "OK") {
        const solved = new Set();
        statusData.result.forEach(sub => {
            if (sub.verdict === "OK" && sub.problem.contestId && sub.problem.index) {
                const probId = `${sub.problem.contestId}${sub.problem.index}`;
                if (!solved.has(probId)) {
                    solved.add(probId);
                    // Handle tags for visualization
                    if (isPlayerOne && sub.problem.tags) {
                        sub.problem.tags.forEach(tag => {
                            myCodeforcesTags[tag] = (myCodeforcesTags[tag] || 0) + 1;
                        });
                    }
                }
            }
        });
        totalSolved = solved.size;
    } else {
        throw new Error(`CF Error: ${statusData.comment}`);
    }
    return { totalSolved };
}

function showError(message) {
    const box = document.getElementById('error-message');
    box.innerHTML = message;
    box.classList.remove('hidden');
}

// Helper to get color deterministically based on index
function getAvatarColor(index) {
    return avatarPalette[index % avatarPalette.length];
}

function populateMatrix(players) {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('matrix-container').classList.remove('hidden');

    const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);

    // 1. Set the Champion
    const champion = sortedPlayers[0];
    document.getElementById('winner-name').textContent = champion.name;
    document.getElementById('winner-score').textContent = `${champion.totalScore} Total`;

    // 2. Populate Main Leaderboard
    const listElement = document.getElementById('leaderboard-list');
    listElement.innerHTML = '';
    sortedPlayers.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = `${p.name}: ${p.totalScore} pts`;
        listElement.appendChild(li);
    });
    
    // Reset main chart card hint
    document.getElementById('chart-container').classList.add('hidden');
    const hint = document.querySelector('.click-hint');
    if(hint) hint.style.display = 'block';

    // =========================================================
    // 3. Shareable Flashcard
    // =========================================================
    const you = players.find(p => p.id === 1);
    
    if (you) {
        // Set Header Name
        const exportDisplayName = you.name.toUpperCase();
        document.getElementById('export-name').textContent = exportDisplayName;
        
        // Set Personal Total
        const totalEl = document.getElementById('export-total');
        if (totalEl) totalEl.textContent = you.totalScore;

        // Generate Bar Chart HTML
        const chartContainer = document.getElementById('export-battle-chart-container');
        
        if (chartContainer) {
            chartContainer.innerHTML = ''; // Clear old chart
            
            // Highest score determines 100% width
            const maxScore = sortedPlayers[0].totalScore || 1; 

            sortedPlayers.forEach((player, index) => {
                const initial = player.name.charAt(0).toUpperCase();
                const color = getAvatarColor(index);
                
                // Calculate width percentage, enforce minimum width for visibility
                let widthPercentage = (player.totalScore / maxScore) * 100;
                if(player.totalScore > 0 && widthPercentage < 8) widthPercentage = 8; 

                // Create row HTML
                const barRow = `
                    <div class="chart-bar-row">
                        <div class="bar-label">${player.name}</div>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${widthPercentage}%;">
                                <div class="bar-avatar" style="background-color: ${color};">
                                    ${initial}
                                </div>
                            </div>
                        </div>
                        <div class="bar-value">${player.totalScore}</div>
                    </div>
                `;
                
                chartContainer.innerHTML += barRow;
            });
        }
    }
}

function renderPieChart() {
    const container = document.getElementById('chart-container');
    const hint = document.querySelector('.click-hint');
    if (!container.classList.contains('hidden')) return; // already rendered
    
    const tags = Object.keys(myCodeforcesTags);
    if (tags.length === 0) {
        showError("No Codeforces tags found for Player 1.");
        return;
    }

    container.classList.remove('hidden');
    if(hint) hint.style.display = 'none';

    const sortedTags = tags.sort((a, b) => myCodeforcesTags[b] - myCodeforcesTags[a]).slice(0, 6);
    const dataValues = sortedTags.map(tag => myCodeforcesTags[tag]);

    const ctx = document.getElementById('topicChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = 'Inter';

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedTags,
            datasets: [{
                data: dataValues,
                backgroundColor: avatarPalette, 
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 11 }
                    } 
                } 
            }
        }
    });
}

function downloadFlashcard() {
    const card = document.getElementById('export-card');
    const btn = document.getElementById('download-btn');
    
    if (!card || typeof html2canvas === 'undefined') {
        alert("Library error (html2canvas). Please refresh and try again.");
        return;
    }

    btn.textContent = "Generating Image...";
    btn.disabled = true;

    // Small delay ensures DOM and CSS are fully painted before capturing
    setTimeout(() => {
        html2canvas(card, {
            scale: 2, // High definition
            backgroundColor: "#000000", // Force black background in image
            useCORS: true, // Allow cross-origin images if any
            allowTaint: true,
            logging: false,
            // Ensure width is fixed for the snapshot
            width: 400 
        }).then(canvas => {
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.download = `Code-Wrapped-Arena-${new Date().toISOString().slice(0,10)}.png`;
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
            alert("Could not generate image. Check console for details.");
        });
    }, 500); 
}
