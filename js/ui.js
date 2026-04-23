const UI = {
    elements: {},
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSavedSettings();
    },
    
    cacheElements() {
        this.elements = {
            mainMenu: document.getElementById('main-menu'),
            settingsScreen: document.getElementById('settings-screen'),
            recordsScreen: document.getElementById('records-screen'),
            dailyScreen: document.getElementById('daily-screen'),
            gameScreen: document.getElementById('game-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            gameoverScreen: document.getElementById('gameover-screen'),
            
            startBtn: document.getElementById('startBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            recordsBtn: document.getElementById('recordsBtn'),
            dailyBtn: document.getElementById('dailyBtn'),
            
            backFromSettings: document.getElementById('backFromSettings'),
            backFromRecords: document.getElementById('backFromRecords'),
            backFromDaily: document.getElementById('backFromDaily'),
            
            difficultySelect: document.getElementById('difficultySelect'),
            themeSelect: document.getElementById('themeSelect'),
            soundToggle: document.getElementById('soundToggle'),
            
            pauseBtn: document.getElementById('pauseBtn'),
            resumeBtn: document.getElementById('resumeBtn'),
            restartBtn: document.getElementById('restartBtn'),
            quitBtn: document.getElementById('quitBtn'),
            
            playAgainBtn: document.getElementById('playAgainBtn'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            tryAgainBtn: document.getElementById('tryAgainBtn'),
            backToMenuFromGameover: document.getElementById('backToMenuFromGameover'),
            
            pairsLeft: document.getElementById('pairsLeft'),
            timeLeft: document.getElementById('timeLeft'),
            attempts: document.getElementById('attempts'),
            
            gameMessage: document.getElementById('gameMessage'),
            
            resultDifficulty: document.getElementById('resultDifficulty'),
            resultTime: document.getElementById('resultTime'),
            resultAttempts: document.getElementById('resultAttempts'),
            resultTheme: document.getElementById('resultTheme'),
            newRecord: document.getElementById('newRecord'),
            unlockMessage: document.getElementById('unlockMessage'),
            
            currentDate: document.getElementById('currentDate'),
            streakInfo: document.getElementById('streakInfo'),
            expFill: document.getElementById('expFill'),
            expText: document.getElementById('expText'),
            
            task1Status: document.getElementById('task1-status'),
            task2Status: document.getElementById('task2-status'),
            task3Status: document.getElementById('task3-status')
        };
    },
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => Game.startGame());
        
        this.elements.settingsBtn.addEventListener('click', () => this.showScreen('settings'));
        this.elements.recordsBtn.addEventListener('click', () => {
            this.updateRecords();
            this.showScreen('records');
        });
        this.elements.dailyBtn.addEventListener('click', () => {
            this.updateDaily();
            this.showScreen('daily');
        });
        
        this.elements.backFromSettings.addEventListener('click', () => this.showScreen('menu'));
        this.elements.backFromRecords.addEventListener('click', () => this.showScreen('menu'));
        this.elements.backFromDaily.addEventListener('click', () => this.showScreen('menu'));
        
        this.elements.difficultySelect.addEventListener('change', (e) => {
            Storage.setDifficulty(e.target.value);
            Game.currentDifficulty = e.target.value;
        });
        
        this.elements.themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            if (Storage.isThemeUnlocked(theme)) {
                Storage.setTheme(theme);
                Game.currentTheme = theme;
            } else {
                e.target.value = Storage.settings.theme;
                alert('该主题尚未解锁，请先完成对应的难度关卡！');
            }
        });
        
        this.elements.soundToggle.addEventListener('change', (e) => {
            Storage.setSound(e.target.checked);
            Game.soundEnabled = e.target.checked;
        });
        
        this.elements.pauseBtn.addEventListener('click', () => Game.pause());
        this.elements.resumeBtn.addEventListener('click', () => Game.resume());
        this.elements.restartBtn.addEventListener('click', () => Game.restart());
        this.elements.quitBtn.addEventListener('click', () => Game.quit());
        
        this.elements.playAgainBtn.addEventListener('click', () => {
            this.hideVictory();
            Game.startGame();
        });
        this.elements.backToMenuBtn.addEventListener('click', () => {
            this.hideVictory();
            this.showScreen('menu');
        });
        
        this.elements.tryAgainBtn.addEventListener('click', () => {
            this.hideGameOver();
            Game.startGame();
        });
        this.elements.backToMenuFromGameover.addEventListener('click', () => {
            this.hideGameOver();
            this.showScreen('menu');
        });
    },
    
    loadSavedSettings() {
        this.elements.difficultySelect.value = Storage.settings.difficulty;
        this.elements.themeSelect.value = Storage.settings.theme;
        this.elements.soundToggle.checked = Storage.settings.sound;
        this.updateThemeOptions();
    },
    
    updateThemeOptions() {
        const options = this.elements.themeSelect.options;
        for (let i = 0; i < options.length; i++) {
            const theme = options[i].value;
            const isUnlocked = Storage.isThemeUnlocked(theme);
            options[i].setAttribute('data-unlocked', isUnlocked);
            
            if (!isUnlocked) {
                options[i].style.color = '#888';
            } else {
                options[i].style.color = '#fff';
            }
        }
    },
    
    showScreen(screen) {
        this.elements.mainMenu.classList.add('hidden');
        this.elements.settingsScreen.classList.add('hidden');
        this.elements.recordsScreen.classList.add('hidden');
        this.elements.dailyScreen.classList.add('hidden');
        this.elements.gameScreen.classList.add('hidden');
        
        switch(screen) {
            case 'menu':
                this.elements.mainMenu.classList.remove('hidden');
                break;
            case 'settings':
                this.elements.settingsScreen.classList.remove('hidden');
                break;
            case 'records':
                this.elements.recordsScreen.classList.remove('hidden');
                break;
            case 'daily':
                this.elements.dailyScreen.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameScreen.classList.remove('hidden');
                break;
        }
    },
    
    updateHUD(pairs, time, attempts) {
        this.updatePairs(pairs);
        this.updateTime(time);
        this.updateAttempts(attempts);
    },
    
    updatePairs(pairs) {
        this.elements.pairsLeft.textContent = pairs;
    },
    
    updateTime(time) {
        this.elements.timeLeft.textContent = Game.getFormattedTime(time);
    },
    
    updateAttempts(attempts) {
        this.elements.attempts.textContent = attempts;
    },
    
    showMessage(text) {
        this.elements.gameMessage.textContent = text;
        this.elements.gameMessage.classList.remove('hidden');
    },
    
    hideMessage() {
        this.elements.gameMessage.classList.add('hidden');
    },
    
    showPause() {
        this.elements.pauseScreen.classList.remove('hidden');
    },
    
    hidePause() {
        this.elements.pauseScreen.classList.add('hidden');
    },
    
    showVictory(difficulty, time, attempts, theme, isNewRecord, unlockedTheme) {
        const difficultyNames = {
            easy: '简单',
            medium: '中等',
            hard: '困难',
            expert: '专家'
        };
        
        const themeNames = {
            animals: '动物',
            fruits: '水果',
            symbols: '符号',
            space: '太空',
            ocean: '海洋'
        };
        
        this.elements.resultDifficulty.textContent = difficultyNames[difficulty];
        this.elements.resultTime.textContent = Game.getFormattedTime(time);
        this.elements.resultAttempts.textContent = attempts;
        this.elements.resultTheme.textContent = themeNames[theme];
        
        if (isNewRecord) {
            this.elements.newRecord.classList.remove('hidden');
        } else {
            this.elements.newRecord.classList.add('hidden');
        }
        
        if (unlockedTheme) {
            const themeNames = {
                space: '太空主题',
                ocean: '海洋主题'
            };
            this.elements.unlockMessage.textContent = `🎁 解锁新主题: ${themeNames[unlockedTheme]}!`;
            this.elements.unlockMessage.classList.remove('hidden');
            this.updateThemeOptions();
        } else {
            this.elements.unlockMessage.classList.add('hidden');
        }
        
        this.elements.victoryScreen.classList.remove('hidden');
    },
    
    hideVictory() {
        this.elements.victoryScreen.classList.add('hidden');
    },
    
    showGameOver() {
        this.elements.gameoverScreen.classList.remove('hidden');
    },
    
    hideGameOver() {
        this.elements.gameoverScreen.classList.add('hidden');
    },
    
    updateRecords() {
        const levels = ['easy', 'medium', 'hard', 'expert'];
        levels.forEach(level => {
            const element = document.getElementById(`${level}-time`);
            if (element) {
                element.textContent = Storage.getFormattedTime(Storage.fastestTimes[level]);
            }
        });
        
        const historyList = document.getElementById('historyList');
        if (Storage.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">暂无通关记录</p>';
        } else {
            historyList.innerHTML = '';
            
            const difficultyNames = {
                easy: '简单',
                medium: '中等',
                hard: '困难',
                expert: '专家'
            };
            
            Storage.history.forEach(entry => {
                const date = new Date(entry.date);
                const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
                
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-date">${dateStr}</div>
                    <div class="history-info">
                        <span>${difficultyNames[entry.difficulty]}</span>
                        <span>用时: ${Game.getFormattedTime(entry.time)}</span>
                        <span>尝试: ${entry.attempts}次</span>
                    </div>
                `;
                historyList.appendChild(item);
            });
        }
    },
    
    updateDaily() {
        const progress = Storage.checkDailyProgress();
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
        
        this.elements.currentDate.textContent = dateStr;
        this.elements.streakInfo.textContent = `连续打卡: ${Storage.playerStats.streak}天`;
        
        const expProgress = Storage.getExpProgress();
        this.elements.expFill.style.width = `${expProgress}%`;
        this.elements.expText.textContent = `等级 ${Storage.playerStats.level} - ${Storage.playerStats.exp}/${Storage.getExpForLevel(Storage.playerStats.level)} 经验`;
        
        this.updateTaskStatus(this.elements.task1Status, progress.tasks.easy);
        this.updateTaskStatus(this.elements.task2Status, progress.tasks.medium);
        this.updateTaskStatus(this.elements.task3Status, progress.tasks.speedRun);
        
        const taskItems = document.querySelectorAll('.task-item');
        if (progress.tasks.easy) taskItems[0].classList.add('completed');
        if (progress.tasks.medium) taskItems[1].classList.add('completed');
        if (progress.tasks.speedRun) taskItems[2].classList.add('completed');
    },
    
    updateTaskStatus(element, completed) {
        if (completed) {
            element.textContent = '已完成';
            element.classList.add('completed');
        } else {
            element.textContent = '未完成';
            element.classList.remove('completed');
        }
    }
};
