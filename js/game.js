const Game = {
    state: 'menu',
    currentDifficulty: 'medium',
    currentTheme: 'animals',
    
    pairsTotal: 0,
    pairsLeft: 0,
    timeLeft: 0,
    timeLimit: 0,
    showTime: 0,
    attempts: 0,
    startTime: 0,
    elapsedTime: 0,
    
    flippedCards: [],
    isProcessing: false,
    canClick: false,
    
    timerInterval: null,
    showTimeTimer: null,
    
    soundEnabled: true,
    
    init() {
        Storage.init();
        this.loadSettings();
    },
    
    loadSettings() {
        this.currentDifficulty = Storage.settings.difficulty;
        this.currentTheme = Storage.settings.theme;
        this.soundEnabled = Storage.settings.sound;
    },
    
    startGame() {
        this.state = 'showing';
        this.flippedCards = [];
        this.isProcessing = false;
        this.canClick = false;
        this.attempts = 0;
        this.elapsedTime = 0;
        
        const config = WebGLRenderer.generateCards(this.currentDifficulty, this.currentTheme);
        this.pairsTotal = config.pairs;
        this.pairsLeft = config.pairs;
        this.timeLimit = config.timeLimit;
        this.showTime = config.showTime;
        this.timeLeft = config.timeLimit;
        
        WebGLRenderer.cards.forEach(card => {
            card.isFlipped = true;
            card.rotationY = Math.PI;
            card.targetRotationY = Math.PI;
        });
        
        UI.showScreen('game');
        UI.updateHUD(this.pairsLeft, this.timeLeft, this.attempts);
        UI.showMessage(`记住图标位置！${this.showTime}秒后隐藏`);
        
        this.showTimeTimer = setTimeout(() => {
            this.hideAllCards();
        }, this.showTime * 1000);
    },
    
    hideAllCards() {
        this.state = 'playing';
        this.canClick = true;
        UI.hideMessage();
        
        WebGLRenderer.cards.forEach(card => {
            card.isFlipped = false;
            card.targetRotationY = 0;
            card.rotationY = Math.PI;
        });
        
        this.startTimer();
    },
    
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            if (this.state !== 'playing') return;
            
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.timeLeft = Math.max(0, this.timeLimit - this.elapsedTime);
            
            UI.updateTime(this.timeLeft);
            
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    },
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.showTimeTimer) {
            clearTimeout(this.showTimeTimer);
            this.showTimeTimer = null;
        }
    },
    
    handleCardClick(cardIndex) {
        if (this.state !== 'playing' || !this.canClick || this.isProcessing) return;
        
        const card = WebGLRenderer.cards[cardIndex];
        if (!card || card.isMatched || card.isFlipped) return;
        
        const flipped = WebGLRenderer.flipCard(cardIndex);
        if (!flipped) return;
        
        this.playSound('flip');
        
        this.flippedCards.push(cardIndex);
        
        if (this.flippedCards.length === 2) {
            this.attempts++;
            UI.updateAttempts(this.attempts);
            this.checkMatch();
        }
    },
    
    checkMatch() {
        this.isProcessing = true;
        this.canClick = false;
        
        const [index1, index2] = this.flippedCards;
        const card1 = WebGLRenderer.cards[index1];
        const card2 = WebGLRenderer.cards[index2];
        
        if (card1.emojiIndex === card2.emojiIndex) {
            this.playSound('match');
            WebGLRenderer.matchCards(index1, index2);
            this.pairsLeft--;
            UI.updatePairs(this.pairsLeft);
            
            if (this.pairsLeft === 0) {
                setTimeout(() => this.victory(), 500);
            } else {
                this.flippedCards = [];
                this.isProcessing = false;
                this.canClick = true;
            }
        } else {
            this.playSound('wrong');
            setTimeout(() => {
                WebGLRenderer.unflipCard(index1);
                WebGLRenderer.unflipCard(index2);
                this.flippedCards = [];
                this.isProcessing = false;
                this.canClick = true;
            }, 1000);
        }
    },
    
    victory() {
        this.state = 'victory';
        this.stopTimer();
        
        const finalTime = this.elapsedTime;
        const isNewRecord = Storage.updateFastestTime(this.currentDifficulty, finalTime);
        const unlockedTheme = Storage.checkThemeUnlock(this.currentDifficulty);
        
        Storage.addHistoryEntry(this.currentDifficulty, finalTime, this.attempts, this.currentTheme);
        Storage.updateDailyTask(this.currentDifficulty, finalTime);
        
        UI.showVictory(
            this.currentDifficulty,
            finalTime,
            this.attempts,
            this.currentTheme,
            isNewRecord,
            unlockedTheme
        );
    },
    
    gameOver() {
        this.state = 'gameover';
        this.stopTimer();
        UI.showGameOver();
    },
    
    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.stopTimer();
        UI.showPause();
    },
    
    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        this.startTime = Date.now() - this.elapsedTime * 1000;
        this.startTimer();
        UI.hidePause();
    },
    
    restart() {
        this.stopTimer();
        this.startGame();
    },
    
    quit() {
        this.state = 'menu';
        this.stopTimer();
        UI.showScreen('menu');
        UI.hidePause();
    },
    
    playSound(type) {
        if (!this.soundEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch(type) {
                case 'flip':
                    oscillator.frequency.value = 400;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                    
                case 'match':
                    oscillator.frequency.value = 523;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    
                    setTimeout(() => {
                        const osc2 = audioContext.createOscillator();
                        const gain2 = audioContext.createGain();
                        osc2.connect(gain2);
                        gain2.connect(audioContext.destination);
                        osc2.frequency.value = 659;
                        osc2.type = 'sine';
                        gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                        osc2.start(audioContext.currentTime);
                        osc2.stop(audioContext.currentTime + 0.3);
                    }, 100);
                    break;
                    
                case 'wrong':
                    oscillator.frequency.value = 200;
                    oscillator.type = 'sawtooth';
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
            }
        } catch(e) {
        }
    },
    
    getFormattedTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};
