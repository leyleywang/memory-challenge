const Storage = {
    PREFIX: 'memory_challenge_',
    
    settings: {
        difficulty: 'medium',
        theme: 'animals',
        sound: true
    },
    
    fastestTimes: {
        easy: null,
        medium: null,
        hard: null,
        expert: null
    },
    
    history: [],
    
    dailyProgress: null,
    
    playerStats: {
        level: 1,
        exp: 0,
        streak: 0,
        lastPlayDate: null
    },
    
    unlockedThemes: {
        animals: true,
        fruits: true,
        symbols: true,
        space: false,
        ocean: false
    },
    
    init() {
        this.loadSettings();
        this.loadFastestTimes();
        this.loadHistory();
        this.loadDailyProgress();
        this.loadPlayerStats();
        this.loadUnlockedThemes();
    },
    
    getKey(key) {
        return this.PREFIX + key;
    },
    
    saveSettings() {
        localStorage.setItem(this.getKey('settings'), JSON.stringify(this.settings));
    },
    
    loadSettings() {
        const saved = localStorage.getItem(this.getKey('settings'));
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    },
    
    setDifficulty(level) {
        this.settings.difficulty = level;
        this.saveSettings();
    },
    
    setTheme(theme) {
        this.settings.theme = theme;
        this.saveSettings();
    },
    
    setSound(enabled) {
        this.settings.sound = enabled;
        this.saveSettings();
    },
    
    saveFastestTimes() {
        localStorage.setItem(this.getKey('fastestTimes'), JSON.stringify(this.fastestTimes));
    },
    
    loadFastestTimes() {
        const saved = localStorage.getItem(this.getKey('fastestTimes'));
        if (saved) {
            this.fastestTimes = { ...this.fastestTimes, ...JSON.parse(saved) };
        }
    },
    
    updateFastestTime(difficulty, time) {
        const current = this.fastestTimes[difficulty];
        if (current === null || time < current) {
            this.fastestTimes[difficulty] = time;
            this.saveFastestTimes();
            return true;
        }
        return false;
    },
    
    getFormattedTime(seconds) {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    saveHistory() {
        localStorage.setItem(this.getKey('history'), JSON.stringify(this.history));
    },
    
    loadHistory() {
        const saved = localStorage.getItem(this.getKey('history'));
        if (saved) {
            this.history = JSON.parse(saved);
        }
    },
    
    addHistoryEntry(difficulty, time, attempts, theme) {
        const entry = {
            date: new Date().toISOString(),
            difficulty,
            time,
            attempts,
            theme
        };
        this.history.unshift(entry);
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
        this.saveHistory();
    },
    
    saveDailyProgress() {
        localStorage.setItem(this.getKey('dailyProgress'), JSON.stringify(this.dailyProgress));
    },
    
    loadDailyProgress() {
        const saved = localStorage.getItem(this.getKey('dailyProgress'));
        if (saved) {
            this.dailyProgress = JSON.parse(saved);
        }
    },
    
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    },
    
    checkDailyProgress() {
        const today = this.getTodayKey();
        if (!this.dailyProgress || this.dailyProgress.date !== today) {
            this.dailyProgress = {
                date: today,
                tasks: {
                    easy: false,
                    medium: false,
                    speedRun: false
                },
                expEarned: 0
            };
            this.saveDailyProgress();
        }
        return this.dailyProgress;
    },
    
    updateDailyTask(difficulty, time) {
        const progress = this.checkDailyProgress();
        
        if (difficulty === 'easy') {
            progress.tasks.easy = true;
            this.addExp(10);
            progress.expEarned += 10;
        }
        
        if (difficulty === 'medium') {
            progress.tasks.medium = true;
            this.addExp(20);
            progress.expEarned += 20;
        }
        
        if (time <= 60 && !progress.tasks.speedRun) {
            progress.tasks.speedRun = true;
            this.addExp(30);
            progress.expEarned += 30;
        }
        
        this.saveDailyProgress();
        this.updateStreak();
    },
    
    savePlayerStats() {
        localStorage.setItem(this.getKey('playerStats'), JSON.stringify(this.playerStats));
    },
    
    loadPlayerStats() {
        const saved = localStorage.getItem(this.getKey('playerStats'));
        if (saved) {
            this.playerStats = { ...this.playerStats, ...JSON.parse(saved) };
        }
    },
    
    addExp(amount) {
        this.playerStats.exp += amount;
        const expNeeded = this.getExpForLevel(this.playerStats.level);
        
        if (this.playerStats.exp >= expNeeded) {
            this.playerStats.exp -= expNeeded;
            this.playerStats.level++;
        }
        
        this.savePlayerStats();
    },
    
    getExpForLevel(level) {
        return level * 100;
    },
    
    getExpProgress() {
        const current = this.playerStats.exp;
        const needed = this.getExpForLevel(this.playerStats.level);
        return (current / needed) * 100;
    },
    
    updateStreak() {
        const today = this.getTodayKey();
        const lastPlay = this.playerStats.lastPlayDate;
        
        if (lastPlay === today) {
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastPlay === yesterdayStr || !lastPlay) {
            this.playerStats.streak++;
        } else {
            this.playerStats.streak = 1;
        }
        
        this.playerStats.lastPlayDate = today;
        this.savePlayerStats();
    },
    
    saveUnlockedThemes() {
        localStorage.setItem(this.getKey('unlockedThemes'), JSON.stringify(this.unlockedThemes));
    },
    
    loadUnlockedThemes() {
        const saved = localStorage.getItem(this.getKey('unlockedThemes'));
        if (saved) {
            this.unlockedThemes = { ...this.unlockedThemes, ...JSON.parse(saved) };
        }
    },
    
    checkThemeUnlock(difficulty) {
        let unlocked = null;
        
        if (difficulty === 'hard' && !this.unlockedThemes.space) {
            this.unlockedThemes.space = true;
            unlocked = 'space';
        }
        
        if (difficulty === 'expert' && !this.unlockedThemes.ocean) {
            this.unlockedThemes.ocean = true;
            unlocked = 'ocean';
        }
        
        if (unlocked) {
            this.saveUnlockedThemes();
        }
        
        return unlocked;
    },
    
    isThemeUnlocked(theme) {
        return this.unlockedThemes[theme];
    }
};
