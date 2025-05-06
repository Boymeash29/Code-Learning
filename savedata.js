class GameSave {
    constructor() {
        this.saveKey = 'codeFixerGameSave';
        this.defaultData = {
            score: 0,
            streak: 0,
            currentLanguage: 'cpp',
            currentLevel: 1,
            completedChallenges: {}
        };
    }

    load() {
        const savedData = localStorage.getItem(this.saveKey);
        if (savedData) {
            return JSON.parse(savedData);
        }
        return {...this.defaultData};
    }

    save(data) {
        localStorage.setItem(this.saveKey, JSON.stringify(data));
    }

    reset() {
        localStorage.removeItem(this.saveKey);
        return {...this.defaultData};
    }

    markChallengeCompleted(language, level, challengeId) {
        const saveData = this.load();
        
        if (!saveData.completedChallenges[language]) {
            saveData.completedChallenges[language] = {};
        }
        
        if (!saveData.completedChallenges[language][level]) {
            saveData.completedChallenges[language][level] = [];
        }
        
        if (!saveData.completedChallenges[language][level].includes(challengeId)) {
            saveData.completedChallenges[language][level].push(challengeId);
        }
        
        this.save(saveData);
    }
}

const gameSave = new GameSave();
