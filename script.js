document.getElementById('fetch-btn').addEventListener('click', fetchStats);

let currentSlideIndex = 0;
let slides = [];
let slideTimeout;
const SLIDE_DURATION = 5000; // 5 seconds per slide

async function fetchStats() {
    const lcUsername = document.getElementById('leetcode-username').value.trim();
    const cfHandle = document.getElementById('codeforces-handle').value.trim();
    const errorBox = document.getElementById('error-message');
    const fetchBtn = document.getElementById('fetch-btn');

    errorBox.classList.add('hidden');

    if (!lcUsername && !cfHandle) {
        showError("Please enter at least one username.");
        return;
    }

    fetchBtn.textContent = "Analyzing your data...";
    fetchBtn.disabled = true;

    try {
        let lcData = null;
        let cfData = null;

        if (lcUsername) lcData = await getLeetCodeStats(lcUsername);
        if (cfHandle) cfData = await getCodeforcesStats(cfHandle);
        
        generateWrappedStory(lcData, cfData);
    } catch (error) {
        showError(error.message);
    } finally {
        fetchBtn.textContent = "Show My Wrapped";
        fetchBtn.disabled = false;
    }
}

async function getLeetCodeStats(username) {
    const url = `https://leetcode-api-faisalshohag.vercel.app/${username}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errors || !data.totalSolved) throw new Error(`LeetCode: User not found.`);
    return data;
}

async function getCodeforcesStats(handle) {
    const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    if (infoData.status !== "OK") throw new Error(`Codeforces: ${infoData.comment}`);

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
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}

/* --- WRAPPED STORY LOGIC --- */

function generateWrappedStory(lcData, cfData) {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('wrapped-container').classList.remove('hidden');

    slides = [];
    
    // Slide 1: Intro
    slides.push({
        bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
        html: `
            <h2>This year, you didn't just write code.</h2>
            <h2>You built things.</h2>
        `
    });

    // Slide 2: Leetcode
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

    // Slide 3: Codeforces
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

    // Slide 4: Outro
    slides.push({
        bg: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
        html: `
            <h2>Your Developer Aura is</h2>
            <div class="highlight">Unmatched ✨</div>
            <button onclick="location.reload()" style="margin-top:30px; background:white; color:black;">Do it again</button>
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
    
    // Render slide
    container.innerHTML = `
        <div class="slide" style="background: ${slides[index].bg}">
            <div class="slide-content">${slides[index].html}</div>
        </div>
    `;
    
    // Animate progress bar
    setTimeout(() => {
        const fill = document.getElementById(`fill-${index}`);
        fill.style.transition = `width ${SLIDE_DURATION}ms linear`;
        fill.style.width = '100%';
    }, 50);

    // Set timer for next slide
    slideTimeout = setTimeout(() => {
        nextSlide();
    }, SLIDE_DURATION);
}

function nextSlide() {
    if (currentSlideIndex < slides.length) {
        // Instantly fill current bar if user tapped early
        const currentFill = document.getElementById(`fill-${currentSlideIndex}`);
        currentFill.style.transition = 'none';
        currentFill.style.width = '100%';
    }
    
    currentSlideIndex++;
    if (currentSlideIndex < slides.length) {
        showSlide(currentSlideIndex);
    }
}
