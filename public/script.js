let currentScreen = 1;
const totalScreens = 4;
let countdownValue = 5;
let winningNumbers = [];
let autoPlayEnabled = true;
let sounds = {};

// Check if browser supports Opus format
function checkOpusSupport() {
    const audio = document.createElement('audio');
    return audio.canPlayType('audio/ogg; codecs="opus"') !== '';
}

window.addEventListener('DOMContentLoaded', async () => {
    // Log browser audio support
    console.log('Opus support:', checkOpusSupport());
    console.log('Ogg support:', document.createElement('audio').canPlayType('audio/ogg'));
    sounds = {
        countdown: document.getElementById('countdownSound'),
        drumRoll: document.getElementById('drumRollSound'),
        reveal: document.getElementById('revealSound'),
        victory: document.getElementById('victorySound')
    };
    
    // Function to preload a single audio file
    const loadAudio = (audio) => {
        return new Promise((resolve) => {
            // Set a timeout to prevent indefinite loading
            const timeoutId = setTimeout(() => {
                console.warn('Audio loading timed out:', audio.src);
                if (audio.readyState < 4) {
                    // If we're timing out, log detailed information
                    console.warn('Audio element details:', {
                        src: audio.querySelector('source')?.src || audio.src,
                        readyState: audio.readyState,
                        networkState: audio.networkState,
                        error: audio.error ? audio.error.code : 'none'
                    });
                }
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve();
            }, 5000); // 5 second timeout
            
            // Define event handlers first so they can be referenced
            const onCanPlay = () => {
                clearTimeout(timeoutId);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                console.log('Audio loaded successfully:', audio.querySelector('source')?.src || audio.src);
                resolve();
            };
            
            const onError = (e) => {
                clearTimeout(timeoutId);
                console.error('Error loading audio:', audio.querySelector('source')?.src || audio.src, e);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve(); // Resolve despite error to continue loading
            };
            
            if (audio.readyState >= 4) {
                clearTimeout(timeoutId);
                resolve();
            } else {
                audio.addEventListener('canplaythrough', onCanPlay);
                audio.addEventListener('error', onError);
                
                // Force reload
                try {
                    audio.load();
                } catch (e) {
                    console.error('Exception during audio.load():', e);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    };

    // Prepare reveal pool
    sounds.revealPool = [];
    const revealSrc = sounds.reveal.querySelector('source').src;

    for (let i = 0; i < 5; i++) {
        const audio = new Audio(revealSrc);
        audio.preload = 'auto';
        sounds.revealPool.push(audio);
    }

    // Preload all sounds
    try {
        // Check if any audio elements have error states already
        Object.values(sounds).forEach(sound => {
            if (sound instanceof Element && sound.error) {
                console.error('Audio already has error before loading:', sound.id, sound.error.code);
            }
        });
        
        const allSounds = [
            ...Object.values(sounds).filter(s => s instanceof Element),
            ...sounds.revealPool
        ];

        const loadPromises = allSounds.map(audio => {
            audio.volume = 1.0;
            return loadAudio(audio);
        });
        
        // Add a global timeout to ensure we don't wait forever
        const globalTimeout = new Promise(resolve => {
            setTimeout(() => {
                console.warn('Global audio loading timeout reached');
                resolve();
            }, 6000); // 6 second global timeout (reduced from 8s)
        });
        
        // Wait for all sounds to load or timeout
        await Promise.race([
            Promise.all(loadPromises),
            globalTimeout
        ]);
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                showScreen(1);
            }, 500);
        } else {
            showScreen(1);
        }
    } catch (error) {
        console.error('Error loading audio:', error);
        // Fallback: start anyway
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        showScreen(1);
    }
});

function stopSound(audio) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function stopAllSounds() {
    Object.values(sounds).forEach(s => {
        if (s instanceof Element) stopSound(s);
    });
    if (sounds.revealPool) {
        sounds.revealPool.forEach(s => stopSound(s));
    }
}

function showScreen(screenNumber) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.querySelector(`.screen-${screenNumber}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        if (screenNumber === 1) {
            stopAllSounds();
            startCountdown();
        } else if (screenNumber === 2) {
            if (autoPlayEnabled) {
                setTimeout(() => nextScreen(), 2000);
            }
        } else if (screenNumber === 3) {
            generateWinningNumbers();
            setTimeout(() => animateLottoBalls(), 100);
        } else if (screenNumber === 4) {
            stopSound(sounds.drumRoll);
            if (sounds.victory) {
                sounds.victory.currentTime = 0;
                sounds.victory.play().catch(e => console.log('Victory audio:', e));
            }
            createConfetti();
        }
    }
}

function startCountdown() {
    countdownValue = 5;
    const countdownElement = document.getElementById('countdown-img');
    const images = {
        5: '5.png',
        4: '4.png',
        3: '3.png',
        2: '2.png',
        1: '1.png'
    };
    
    if (sounds.countdown) {
        sounds.countdown.muted = false;
        sounds.countdown.loop = false;
        sounds.countdown.currentTime = 0;
        sounds.countdown.play().catch(e => console.log('Countdown audio:', e));
    }
    
    const countdownInterval = setInterval(() => {
        countdownValue--;
        
        if (countdownValue >= 1) {
            countdownElement.src = images[countdownValue];
            countdownElement.classList.remove('zoom-out');
            
            setTimeout(() => {
                countdownElement.classList.add('zoom-out');
            }, 10);
        }
        
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            if (autoPlayEnabled) {
                setTimeout(() => nextScreen(), 500);
            }
        }
    }, 1000);
}

function generateWinningNumbers() {
    winningNumbers = [];
    const usedNumbers = new Set();
    
    while (winningNumbers.length < 5) {
        const num = Math.floor(Math.random() * 50) + 1;
        if (!usedNumbers.has(num)) {
            usedNumbers.add(num);
            winningNumbers.push(num);
        }
    }
}

function animateLottoBalls() {
    const balls = document.querySelectorAll('.ball');
    const gameTitle = document.querySelector('.game-title');
    const intervals = [];
    
    if (sounds.drumRoll) {
        sounds.drumRoll.loop = true;
        sounds.drumRoll.currentTime = 0;
        sounds.drumRoll.play().catch(e => console.log('Drum roll audio:', e));
    }
    
    balls.forEach((ball, index) => {
        const winningNumber = winningNumbers[index];
        
        const numberDisplay = document.createElement('div');
        numberDisplay.className = 'ball-number-display';
        numberDisplay.textContent = '?';
        numberDisplay.style.width = '100%';
        numberDisplay.style.height = '100%';
        numberDisplay.style.display = 'flex';
        numberDisplay.style.alignItems = 'center';
        numberDisplay.style.justifyContent = 'center';
        numberDisplay.style.fontSize = '32px';
        numberDisplay.style.fontWeight = '900';
        numberDisplay.style.color = 'white';
        
        ball.innerHTML = '';
        ball.appendChild(numberDisplay);
        
        let currentNum = Math.floor(Math.random() * 50) + 1;
        const scrollInterval = setInterval(() => {
            numberDisplay.textContent = currentNum;
            currentNum = Math.floor(Math.random() * 50) + 1;
        }, 80);
        
        intervals.push(scrollInterval);
    });
    
    setTimeout(() => {
        balls.forEach((ball, index) => {
            const winningNumber = winningNumbers[index];
            const revealDelay = index * 1200;
            
            setTimeout(() => {
                clearInterval(intervals[index]);
                
                const numberDisplay = ball.querySelector('.ball-number-display');
                
                setTimeout(() => {
                    numberDisplay.textContent = winningNumber;
                    
                    if (sounds.revealPool && sounds.revealPool[index]) {
                        const revealSound = sounds.revealPool[index];
                        revealSound.currentTime = 0;
                        revealSound.play().catch(e => console.log('Reveal audio:', e));
                    }
                    
                    ball.classList.add('reveal');
                    setTimeout(() => {
                        ball.classList.remove('reveal');
                    }, 1200);
                }, 100);
            }, revealDelay);
        });
    }, 1500);
    
    const totalAnimationTime = 1500 + (4 * 1200) + 800;
    
    setTimeout(() => {
        if (gameTitle) {
            gameTitle.classList.add('show');
        }
    }, totalAnimationTime);
    
    if (autoPlayEnabled) {
        setTimeout(() => nextScreen(), totalAnimationTime + 2000);
    }
}

function nextScreen() {
    currentScreen++;
    if (currentScreen > totalScreens) {
        currentScreen = 1;
    }
    showScreen(currentScreen);
}

function previousScreen() {
    currentScreen--;
    if (currentScreen < 1) {
        currentScreen = totalScreens;
    }
    showScreen(currentScreen);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        autoPlayEnabled = false;
        nextScreen();
    } else if (e.key === 'ArrowLeft') {
        autoPlayEnabled = false;
        previousScreen();
    } else if (e.key === 'a' || e.key === 'A') {
        autoPlayEnabled = !autoPlayEnabled;
        if (autoPlayEnabled && currentScreen === 1) {
            showScreen(1);
        }
    }
});

// Removed click listener to allow autoplay to work properly
// document.addEventListener('click', () => {
//     autoPlayEnabled = false;
//     nextScreen();
// });

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    autoPlayEnabled = false;
    if (touchEndX < touchStartX - 50) {
        nextScreen();
    }
    if (touchEndX > touchStartX + 50) {
        previousScreen();
    }
}

function createConfetti() {
    const confettiContainer = document.querySelector('.confetti-container');
    if (!confettiContainer) return;
    
    confettiContainer.innerHTML = '';
    
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const confettiCount = 30;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const drift = (Math.random() - 0.5) * 150;
        const size = Math.random() * 6 + 8;
        
        confetti.style.background = `linear-gradient(135deg, ${color}, ${color}dd)`;
        confetti.style.left = `${left}%`;
        confetti.style.animationDelay = `${delay}s`;
        confetti.style.setProperty('--drift', `${drift}px`);
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.borderRadius = '2px';
        confetti.style.boxShadow = `0 0 ${size * 2}px ${color}88`;
        
        confettiContainer.appendChild(confetti);
    }
    
    for (let i = 0; i < 15; i++) {
        const star = document.createElement('img');
        star.src = 'star.gif';
        star.className = 'confetti star';
        
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const drift = (Math.random() - 0.5) * 100;
        const size = Math.random() * 30 + 40;
        
        star.style.left = `${left}%`;
        star.style.animationDelay = `${delay}s`;
        star.style.setProperty('--drift', `${drift}px`);
        star.style.width = `${size}px`;
        star.style.height = 'auto';
        
        confettiContainer.appendChild(star);
    }
    
    setTimeout(() => {
        createConfetti();
    }, 4000);
}

