import { GameManager } from './game/GameManager.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    game.start();

    // Debug: log computed styles for the UI layer and spawn buttons so we can detect runtime overrides
    try {
        const uiLayer = document.getElementById('ui-layer');
        const btn = document.querySelector('.spawn-btn');
        if (uiLayer) {
            const uiStyle = window.getComputedStyle(uiLayer);
            console.log('DEBUG: #ui-layer computed style', {
                height: uiStyle.height,
                padding: uiStyle.padding,
                display: uiStyle.display,
                alignItems: uiStyle.alignItems,
                pointerEvents: uiStyle.pointerEvents
            });
        }
        if (btn) {
            const btnStyle = window.getComputedStyle(btn);
            console.log('DEBUG: .spawn-btn computed style', {
                width: btnStyle.width,
                height: btnStyle.height,
                padding: btnStyle.padding,
                boxSizing: btnStyle.boxSizing,
                transform: btnStyle.transform
            }, 'inlineAttributes:', btn.getAttribute('style'));
        }
    } catch (e) {
        console.warn('DEBUG: error reading computed styles', e);
    }
});
