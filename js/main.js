const App = {
    init() {
        Storage.init();
        Game.init();
        
        const webglReady = WebGLRenderer.init('gameCanvas');
        
        if (!webglReady) {
            alert('您的浏览器不支持WebGL，无法运行此游戏。请使用支持WebGL的浏览器。');
            return;
        }
        
        UI.init();
        
        WebGLRenderer.onCardClick = (cardIndex) => {
            Game.handleCardClick(cardIndex);
        };
        
        WebGLRenderer.start();
        
        console.log('趣味记忆力挑战游戏已启动！');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.addEventListener('beforeunload', () => {
    WebGLRenderer.stop();
});
