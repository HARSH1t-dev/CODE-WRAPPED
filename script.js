console.log("Code Wrapped script loaded!");

document.getElementById('fetch-btn').addEventListener('click', fetchStats);

let currentSlideIndex = 0;
let slides = [];
let slideTimeout;
const SLIDE_DURATION = 5000; // 5 seconds per slide

async function fetchStats() {
    console.log("Fetch button clicked!");
    const lcUsername = document.getElementById('leetcode-username').value.trim();
    const cfHandle = document.getElementById('codeforces-handle').value.trim();
    const errorBox = document.getElementById('error-message');
    const fetchBtn = document.getElementById('fetch-btn');

    errorBox.classList.add('hidden');
    errorBox.innerHTML = ''; // Clear old errors

    if (!lcUsername && !cfHandle) {
        showError("Please enter at least one username.");
        return;
    }

    fetchBtn.textContent = "Analyzing your data...";
    fetchBtn.disabled = true;

    try {
        let lcData = null;
        let cfData = null;
        let errors = [];

        // Fetch independently: If one fails, the other still generates a slide
        if (lcUsername) {
            try {
                lcData = await getLeetCodeStats(lcUsername);
            } catch (e) {
                console.error("LeetCode Error:", e);
                errors.push(`LeetCode: ${e.message}`);
            }
        }

        if (cfHandle) {
            try {
                cfData = await getCodeforcesStats(cfHandle);
            } catch (e) {
                console.error("Codeforces Error:", e);
                errors.push(`Codeforces: ${e.message}`);
            }
        }
        
        // Only throw a hard error if EVERYTHING failed
        if (!lcData && !cfData) {
             throw new Error("Failed to fetch data:<br><br>" + errors.join("<br>"));
        }

        generateWrappedStory(lcData, cfData);
    } catch (error) {
        showError(error.message);
    } finally {
        fetchBtn.textContent = "Show My Wrapped";
        fetchBtn.disabled = false;
    }
}

async function getLeetCodeStats(username) {
    // Array of fallback APIs because free proxies go down frequently
    const apis = [
        `https://leetcode-stats-api.herokuapp.com/${username}`,
        `https://alfa-leetcode-api.onrender.com/${username}`,
        `https://leetcode-api-faisalshohag.vercel.app/${username}`
    ];
    
    for (const url of apis) {
        try {
            console.log("Trying LeetCode API:", url);
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === "error" || data.errors) continue; // Try the next API
            
            if (data.totalSolved !== undefined) {
                return {
                    totalSolved: data.totalSolved,
                    easySolved: data.easySolved,
                    mediumSolved: data.mediumSolved,
                    hardSolved: data.hardSolved
                };
            }
        } catch (e) {
            console.warn("API failed:", url);
        }
    }
    throw new Error("User not found or all LeetCode APIs are currently down.");
}

async function getCodeforcesStats(handle) {
    console.log("Fetching Codeforces for:", handle);
    const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    if (infoData.status !== "OK") throw new Error(infoData.comment);

    const statusUrl = `https://codeforces.com/api/user.status?handle=${handle}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    
    let totalSolved = 0;
    if (statusData.status === "OK") {
        const solvedProblems = new Set();
        statusData.result.forEach(sub => {
            if (sub.verdict === "OK") solvedProblems.add(`${sub.problem.contestId}${sub.problem.index}`);
        });
        totalSolved = solvedProblems.size;
    }
    return { user: infoData.result[0], totalSolved };
}

function showError(message) {
    const errorBox = document.getElementById('error-message');
    errorBox.innerHTML = message;
    errorBox.classList.remove('hidden');
}

/* --- WRAPPED STORY LOGIC --- */

function generateWrappedStory(lcData, cfData) {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('wrapped-container').classList.remove('hidden');

    slides = [];
    
    slides.push({
        bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
        html: `
            <h2>This year, you didn't just write code.</h2>
            <h2>You built things.</h2>
        `
    });

    if (lcData) {
        slides.push({
            bg: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
            html: `
                <h2>On LeetCode, you crushed</h2>
                <div class="highlight">${lcData.totalSolved}</div>
                <h2>Problems</h2>
                <p>Easy: ${lcData.easySolved} | Med: ${lcData.mediumSolved} | Hard: ${lcData.hardSolved}</p>
            `
        });
    }

    if (cfData) {
        slides.push({
            bg: 'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
            html: `
                <h2>On Codeforces, you conquered</h2>
                <div class="highlight">${cfData.totalSolved}</div>
                <h2>Unique Problems</h2>
                <p>Peak Rating: ${cfData.user.maxRating || "Unrated"} (${cfData.user.rank || "No rank"})</p>
            `
        });
    }

    slides.push({
        bg: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
        html: `
            <h2>Your Developer Aura is</h2>
            <div class="highlight">Unmatched ✨</div>
            <button onclick="location.reload()" style="padding: 15px 30px; margin-top:30px; border-radius:30px; border:none; background:white; color:black; font-weight:bold; font-size: 1.1rem; cursor:pointer;">Do it again</button>
        `
    });

    buildProgressBars();
    currentSlideIndex = 0;
    showSlide(currentSlideIndex);
}

function buildProgressBars() {
    const container = document.getElementById('progress-bars-container');
    container.innerHTML = '';
    slides.forEach((_, i) => {
        container.innerHTML += `<div class="progress-bar"><div class="progress-fill" id="fill-${i}"></div></div>`;
    });
}

function showSlide(index) {
    if (index >= slides.length) return; 
    
    clearTimeout(slideTimeout);
    const container = document.getElementById('slides-container');
    
    container.innerHTML = `
        <div class="slide" style="background: ${slides[index].bg}">
            <div class="slide-content">${slides[index].html}</div>
        </div>
    `;
    
    setTimeout(() => {
        const fill = document.getElementById(`fill-${index}`);
        fill.style.transition = `width ${SLIDE_DURATION}ms linear`;
        fill.style.width = '100%';
    }, 50);

    slideTimeout = setTimeout(() => {
        nextSlide();
    }, SLIDE_DURATION);
}

function nextSlide() {
    if (currentSlideIndex < slides.length) {
        const currentFill = document.getElementById(`fill-${currentSlideIndex}`);
        currentFill.style.transition = 'none';
        currentFill.style.width = '100%';
    }
    
    currentSlideIndex++;
    if (currentSlideIndex < slides.length) {
        showSlide(currentSlideIndex);
    }
}
