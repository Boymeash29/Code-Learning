
// Game state
let currentLanguage = 'cpp';
let currentLevel = 1;
let currentChallenge = {};
let score = 0;
let streak = 0;
let currentChallengeIndex = 0;

// DOM elements
const codeDisplay = document.getElementById('code-content');
const codeEditor = document.getElementById('code-editor');
const submitBtn = document.getElementById('submit-btn');
const hintBtn = document.getElementById('hint-btn');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');
const messageEl = document.getElementById('message');
const diffOutput = document.getElementById('diff-output');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const expectedOutputEl = document.getElementById('expected-output');
const userOutputEl = document.getElementById('user-output');
const challengeTitleEl = document.getElementById('challenge-title');
const languageTabs = document.querySelectorAll('.language-tab');
const levelButtons = document.querySelectorAll('.level-btn');

// Initialize the game
function init() {
    // Load saved data
    const savedData = gameSave.load();
    score = savedData.score;
    streak = savedData.streak;
    currentLanguage = savedData.currentLanguage;
    currentLevel = savedData.currentLevel;

    loadRandomChallenge();
    updateScoreDisplay();
    
    // Event listeners
    submitBtn.addEventListener('click', checkSolution);
    hintBtn.addEventListener('click', showHint);
    nextBtn.addEventListener('click', loadRandomChallenge);
    resetBtn.addEventListener('click', resetCode);
    saveBtn.addEventListener('click', saveGame);
    
    // Language tabs
    languageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentLanguage = tab.dataset.lang;
            document.querySelector('.language-tab.active').classList.remove('active');
            tab.classList.add('active');
            loadRandomChallenge();
            saveGame();
        });
    });
    
    // Level buttons
    levelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentLevel = parseInt(btn.dataset.level);
            document.querySelector('.level-btn.active').classList.remove('active');
            btn.classList.add('active');
            loadRandomChallenge();
            saveGame();
        });
    });

    // Set active tabs from saved data
    document.querySelector(`.language-tab[data-lang="${currentLanguage}"]`).classList.add('active');
    document.querySelector(`.level-btn[data-level="${currentLevel}"]`).classList.add('active');
}

// Save game state
function saveGame() {
    const saveData = {
        score,
        streak,
        currentLanguage,
        currentLevel,
        completedChallenges: gameSave.load().completedChallenges
    };
    gameSave.save(saveData);
    showFeedback('info', 'Progress saved!');
}

// Rest of your game functions (loadRandomChallenge, checkSolution, etc.)
// Same as before but now in separate file
