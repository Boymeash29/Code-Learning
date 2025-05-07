class GameSave {
    constructor() {
        this.currentUser = null;
    }

    // Netlify Identity methods
    async loadUserData(user) {
        if (!user) return this.loadLocal();
        
        try {
            const response = await fetch('/.netlify/functions/get-user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token.access_token}`
                },
                body: JSON.stringify({ userId: user.id })
            });
            return response.ok ? await response.json() : this.loadLocal();
        } catch {
            return this.loadLocal();
        }
    }

    async saveUserData(user, data) {
        this.saveLocal(data); // Always save locally as fallback
        
        if (!user) return false;
        
        try {
            await fetch('/.netlify/functions/save-user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token.access_token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    gameData: data
                })
            });
            return true;
        } catch {
            return false;
        }
    }

    // Local storage fallback
    loadLocal() {
        const data = localStorage.getItem('codeFixerGame');
        return data ? JSON.parse(data) : {
            score: 0,
            streak: 0,
            currentLanguage: 'cpp',
            currentLevel: 1
        };
    }

    saveLocal(data) {
        localStorage.setItem('codeFixerGame', JSON.stringify(data));
    }
}
