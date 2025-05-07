class GameSave {
    constructor() {
        this.currentUser = null;
    }

    async loadUserData(user) {
        this.currentUser = user;
        try {
            // Try Netlify first
            if (user) {
                const response = await fetch('/.netlify/functions/get-user-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token.access_token}`
                    },
                    body: JSON.stringify({ userId: user.id })
                });
                if (response.ok) return await response.json();
            }
            // Fallback to local storage
            return this.loadLocal();
        } catch (error) {
            console.error('Error loading data:', error);
            return this.loadLocal();
        }
    }

    async saveUserData(data) {
        // Always save locally first
        this.saveLocal(data);
        
        // Try to save to Netlify if logged in
        if (this.currentUser) {
            try {
                await fetch('/.netlify/functions/save-user-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.currentUser.token.access_token}`
                    },
                    body: JSON.stringify({
                        userId: this.currentUser.id,
                        gameData: data
                    })
                });
            } catch (error) {
                console.error('Error saving to Netlify:', error);
            }
        }
    }

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
