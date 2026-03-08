document.getElementById('fetch-btn').addEventListener('click', fetchStats);

async function fetchStats() {
    const lcUsername = document.getElementById('leetcode-username').value.trim();
    const cfHandle = document.getElementById('codeforces-handle').value.trim();
    const errorBox = document.getElementById('error-message');
    const dashboard = document.getElementById('dashboard');
    const fetchBtn = document.getElementById('fetch-btn');

    // Reset UI
    errorBox.classList.add('hidden');
    dashboard.classList.add('hidden');
    
    if (!lcUsername && !cfHandle) {
        showError("Please enter at least one username.");
        return;
    }

    fetchBtn.textContent = "Fetching...";
    fetchBtn.disabled = true;

    try {
        if (lcUsername) await getLeetCodeStats(lcUsername);
        if (cfHandle) await getCodeforcesStats(cfHandle);
        
        dashboard.classList.remove('hidden');
    } catch (error) {
        showError(error.message);
    } finally {
        fetchBtn.textContent = "Fetch Stats";
        fetchBtn.disabled = false;
    }
}

async function getLeetCodeStats(username) {
    // Switching to a more reliable Vercel-based proxy API
    const url = `https://leetcode-api-faisalshohag.vercel.app/${username}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // The new API might return errors differently, so we check if totalSolved exists
    if (data.errors || !data.totalSolved) {
        throw new Error(`LeetCode: User not found or API error.`);
    }

    document.getElementById('lc-total').textContent = data.totalSolved;
    document.getElementById('lc-easy').textContent = data.easySolved;
    document.getElementById('lc-medium').textContent = data.mediumSolved;
    document.getElementById('lc-hard').textContent = data.hardSolved;
}

async function getCodeforcesStats(handle) {
    // 1. Fetch User Info (Rating, Rank)
    const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const infoResponse = await fetch(infoUrl);
    const infoData = await infoResponse.json();

    if (infoData.status !== "OK") {
        throw new Error(`Codeforces: ${infoData.comment}`);
    }

    const user = infoData.result[0];
    document.getElementById('cf-rating').textContent = user.rating || "N/A";
    document.getElementById('cf-max-rating').textContent = user.maxRating || "N/A";
    document.getElementById('cf-rank').textContent = user.rank || "Unrated";

    // 2. Fetch User Status to calculate total unique problems solved
    const statusUrl = `https://codeforces.com/api/user.status?handle=${handle}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();

    if (statusData.status === "OK") {
        const submissions = statusData.result;
        const solvedProblems = new Set(); // Use a Set to store unique problems

        submissions.forEach(sub => {
            if (sub.verdict === "OK") {
                // Combine contestId and index to create a unique problem ID (e.g., "1500A")
                const problemId = `${sub.problem.contestId}${sub.problem.index}`;
                solvedProblems.add(problemId);
            }
        });

        document.getElementById('cf-total').textContent = solvedProblems.size;
    }
}

function showError(message) {
    const errorBox = document.getElementById('error-message');
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}