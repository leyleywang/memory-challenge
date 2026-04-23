const WebGLRenderer = {
    canvas: null,
    gl: null,
    width: 0,
    height: 0,
    cards: [],
    animationId: null,
    lastTime: 0,
    
    cardProgram: null,
    cardVertexBuffer: null,
    cardIndexBuffer: null,
    
    backgroundProgram: null,
    
    textures: {},
    
    camera: {
        x: 0,
        y: 0,
        z: 5,
        targetX: 0,
        targetY: 0,
        targetZ: 5
    },
    
    themes: {
        animals: ['🐶', '🐱', '🐰', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄', '🐝'],
        fruits: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🥝', '🍌', '🍉', '🍍', '🥭'],
        symbols: ['⭐', '💎', '❤️', '🔥', '⚡', '🌈', '🌙', '☀️', '💫', '✨', '🎈', '🎯'],
        space: ['🚀', '🛸', '🌍', '🌙', '⭐', '☀️', '🪐', '💫', '☄️', '👽', '🛰️', '🌌'],
        ocean: ['🐳', '🐬', '🦈', '🐙', '🦀', '🐠', '🐡', '🦑', '🐚', '🌊', '⚓', '🏖️']
    },
    
    difficultyConfig: {
        easy: { pairs: 4, timeLimit: 120, showTime: 3 },
        medium: { pairs: 6, timeLimit: 150, showTime: 2.5 },
        hard: { pairs: 8, timeLimit: 180, showTime: 2 },
        expert: { pairs: 12, timeLimit: 240, showTime: 1.5 }
    },
    
    vertexShaderSource: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec2 vTexCoord;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vTexCoord = aTexCoord;
            vNormal = aNormal;
            vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
            vPosition = worldPos.xyz;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
        }
    `,
    
    fragmentShaderSource: `
        precision mediump float;
        
        varying vec2 vTexCoord;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        uniform sampler2D uTexture;
        uniform vec3 uLightPos;
        uniform vec3 uViewPos;
        uniform vec3 uCardColor;
        uniform float uIsBack;
        uniform float uIsMatched;
        
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(uLightPos - vPosition);
            vec3 viewDir = normalize(uViewPos - vPosition);
            vec3 reflectDir = reflect(-lightDir, normal);
            
            float ambient = 0.3;
            float diffuse = max(dot(normal, lightDir), 0.0) * 0.7;
            float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.5;
            
            float lighting = ambient + diffuse + specular;
            float matchFactor = 1.0;
            if (uIsMatched > 0.5) {
                matchFactor = 1.2;
            }
            
            vec4 texColor;
            if (uIsBack > 0.5) {
                texColor = vec4(0.15, 0.2, 0.35, 1.0);
                vec2 center = vTexCoord - 0.5;
                float dist = length(center);
                if (dist > 0.3 && dist < 0.35) {
                    texColor = vec4(0.3, 0.5, 0.8, 1.0);
                }
                if (dist < 0.1 && dist > 0.05) {
                    texColor = vec4(0.4, 0.6, 0.9, 1.0);
                }
            } else {
                texColor = texture2D(uTexture, vTexCoord);
                if (texColor.a < 0.1) {
                    texColor = vec4(0.95, 0.95, 1.0, 1.0);
                }
            }
            
            vec3 finalColor = texColor.rgb * vec3(lighting * matchFactor);
            
            if (uIsMatched > 0.5) {
                finalColor = finalColor * 0.8 + vec3(0.2, 0.8, 0.4) * 0.2;
            }
            
            gl_FragColor = vec4(finalColor, texColor.a);
        }
    `,
    
    backgroundVertexShader: `
        attribute vec2 aPosition;
        varying vec2 vTexCoord;
        
        void main() {
            vTexCoord = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `,
    
    backgroundFragmentShader: `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform float uTime;
        
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
            vec2 pos = vTexCoord;
            
            float n1 = noise(pos * 3.0 + uTime * 0.1);
            float n2 = noise(pos * 5.0 - uTime * 0.05);
            
            vec3 color1 = vec3(0.1, 0.1, 0.2);
            vec3 color2 = vec3(0.06, 0.13, 0.38);
            vec3 color3 = vec3(0.06, 0.2, 0.38);
            
            float t = (n1 + n2) * 0.5;
            
            vec3 finalColor = mix(color1, color2, pos.y);
            finalColor = mix(finalColor, color3, t * 0.3);
            
            vec2 center = vec2(0.5, 0.5);
            float dist = length(pos - center);
            float vignette = 1.0 - dist * 0.5;
            
            finalColor *= vignette;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true });
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return false;
        }
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.initShaders();
        this.initBuffers();
        this.initTextures();
        
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        return true;
    },
    
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.gl.viewport(0, 0, this.width, this.height);
    },
    
    initShaders() {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        
        this.cardProgram = this.gl.createProgram();
        this.gl.attachShader(this.cardProgram, vertexShader);
        this.gl.attachShader(this.cardProgram, fragmentShader);
        this.gl.linkProgram(this.cardProgram);
        
        const bgVertexShader = this.createShader(this.gl.VERTEX_SHADER, this.backgroundVertexShader);
        const bgFragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.backgroundFragmentShader);
        
        this.backgroundProgram = this.gl.createProgram();
        this.gl.attachShader(this.backgroundProgram, bgVertexShader);
        this.gl.attachShader(this.backgroundProgram, bgFragmentShader);
        this.gl.linkProgram(this.backgroundProgram);
    },
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    },
    
    initBuffers() {
        const s = 0.5;
        const d = 0.05;
        
        const vertices = [
            -s, -s,  d,  0,  0,  1,  0, 1,
             s, -s,  d,  0,  0,  1,  1, 1,
             s,  s,  d,  0,  0,  1,  1, 0,
            -s,  s,  d,  0,  0,  1,  0, 0,
            -s, -s, -d,  0,  0, -1,  0, 1,
            -s,  s, -d,  0,  0, -1,  0, 0,
             s,  s, -d,  0,  0, -1,  1, 0,
             s, -s, -d,  0,  0, -1,  1, 1,
            -s,  s, -d,  0,  1,  0,  0, 1,
            -s,  s,  d,  0,  1,  0,  0, 0,
             s,  s,  d,  0,  1,  0,  1, 0,
             s,  s, -d,  0,  1,  0,  1, 1,
            -s, -s, -d,  0, -1,  0,  0, 1,
             s, -s, -d,  0, -1,  0,  1, 1,
             s, -s,  d,  0, -1,  0,  1, 0,
            -s, -s,  d,  0, -1,  0,  0, 0,
             s, -s, -d,  1,  0,  0,  0, 1,
             s,  s, -d,  1,  0,  0,  0, 0,
             s,  s,  d,  1,  0,  0,  1, 0,
             s, -s,  d,  1,  0,  0,  1, 1,
            -s, -s, -d, -1,  0,  0,  0, 1,
            -s, -s,  d, -1,  0,  0,  1, 1,
            -s,  s,  d, -1,  0,  0,  1, 0,
            -s,  s, -d, -1,  0,  0,  0, 0,
        ];
        
        const indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        
        this.cardVertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cardVertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        this.cardIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cardIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        
        this.bgVertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bgVertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1, 1,   1, -1,   1, 1
        ]), this.gl.STATIC_DRAW);
    },
    
    initTextures() {
        const themes = Object.keys(this.themes);
        themes.forEach(theme => {
            this.textures[theme] = [];
            const emojis = this.themes[theme];
            emojis.forEach((emoji, index) => {
                this.textures[theme].push(this.createEmojiTexture(emoji));
            });
        });
    },
    
    createEmojiTexture(emoji) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(245, 245, 255, 1)';
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.fillStyle = 'rgba(200, 200, 220, 0.5)';
        ctx.fillRect(10, 10, 236, 236);
        
        ctx.fillStyle = '#000';
        ctx.font = '160px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 128, 128);
        
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        return texture;
    },
    
    generateCards(difficulty, theme) {
        const config = this.difficultyConfig[difficulty];
        const pairs = config.pairs;
        const themeEmojis = this.themes[theme];
        
        let selectedIndices = [];
        for (let i = 0; i < pairs; i++) {
            selectedIndices.push(i % themeEmojis.length);
        }
        selectedIndices = [...selectedIndices, ...selectedIndices];
        selectedIndices = this.shuffleArray(selectedIndices);
        
        const totalCards = pairs * 2;
        let cols, rows;
        if (totalCards <= 8) {
            cols = 4;
            rows = 2;
        } else if (totalCards <= 16) {
            cols = 4;
            rows = 4;
        } else {
            cols = 6;
            rows = 4;
        }
        
        const spacingX = 1.2;
        const spacingY = 1.2;
        const startX = -((cols - 1) * spacingX) / 2;
        const startY = ((rows - 1) * spacingY) / 2;
        
        this.cards = [];
        
        for (let i = 0; i < totalCards; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            this.cards.push({
                x: startX + col * spacingX,
                y: startY - row * spacingY,
                z: 0,
                rotationY: 0,
                targetRotationY: 0,
                emojiIndex: selectedIndices[i],
                isFlipped: false,
                isMatched: false,
                isAnimating: false,
                matchAnimation: 0,
                scale: 1,
                targetScale: 1
            });
        }
        
        return config;
    },
    
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    flipCard(cardIndex) {
        const card = this.cards[cardIndex];
        if (!card || card.isMatched || card.isFlipped) return false;
        
        card.isFlipped = true;
        card.isAnimating = true;
        card.targetRotationY = Math.PI;
        card.targetScale = 1.1;
        
        return true;
    },
    
    unflipCard(cardIndex) {
        const card = this.cards[cardIndex];
        if (!card) return;
        
        card.isFlipped = false;
        card.isAnimating = true;
        card.targetRotationY = 0;
    },
    
    matchCards(index1, index2) {
        this.cards[index1].isMatched = true;
        this.cards[index2].isMatched = true;
        this.cards[index1].matchAnimation = 1;
        this.cards[index2].matchAnimation = 1;
    },
    
    handleClick(e) {
        if (this.onCardClick) {
            const rect = this.canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
            
            const clickedCard = this.getCardAtPosition(x, y);
            if (clickedCard !== null) {
                this.onCardClick(clickedCard);
            }
        }
    },
    
    getCardAtPosition(x, y) {
        const aspect = this.width / this.height;
        const fov = Math.PI / 4;
        const cardSize = 0.5;
        
        const f = 1.0 / Math.tan(fov / 2);
        const cameraZ = this.camera.z;
        
        const worldX = x * aspect * cameraZ / f + this.camera.x;
        const worldY = y * cameraZ / f + this.camera.y;
        
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const dx = worldX - card.x;
            const dy = worldY - card.y;
            
            if (Math.abs(dx) < cardSize && Math.abs(dy) < cardSize) {
                return i;
            }
        }
        
        return null;
    },
    
    unproject(x, y, aspect, fov, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const z = -1;
        
        const dirX = x * aspect / f;
        const dirY = y / f;
        const dirZ = z;
        
        const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        return [dirX / len, dirY / len, dirZ / len];
    },
    
    rayCardIntersect(origin, dir, card) {
        const halfW = 0.4;
        const halfH = 0.6;
        
        const dx = origin[0] - card.x;
        const dy = origin[1] - card.y;
        const dz = origin[2] - card.z;
        
        if (Math.abs(dx) > halfW + 0.1 || Math.abs(dy) > halfH + 0.1) return false;
        
        const t = -dz / dir[2];
        if (t < 0 || t > 10) return false;
        
        const hitX = origin[0] + dir[0] * t - card.x;
        const hitY = origin[1] + dir[1] * t - card.y;
        
        return Math.abs(hitX) < halfW && Math.abs(hitY) < halfH;
    },
    
    start() {
        this.lastTime = performance.now();
        this.animate();
    },
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },
    
    animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render(currentTime / 1000);
        
        this.animationId = requestAnimationFrame(() => this.animate());
    },
    
    update(deltaTime) {
        this.camera.x += (this.camera.targetX - this.camera.x) * deltaTime * 5;
        this.camera.y += (this.camera.targetY - this.camera.y) * deltaTime * 5;
        this.camera.z += (this.camera.targetZ - this.camera.z) * deltaTime * 5;
        
        this.cards.forEach(card => {
            const rotSpeed = 8;
            if (Math.abs(card.rotationY - card.targetRotationY) > 0.01) {
                card.rotationY += (card.targetRotationY - card.rotationY) * deltaTime * rotSpeed;
            } else {
                card.rotationY = card.targetRotationY;
                card.isAnimating = false;
            }
            
            if (Math.abs(card.scale - card.targetScale) > 0.01) {
                card.scale += (card.targetScale - card.scale) * deltaTime * 10;
            } else {
                card.scale = card.targetScale;
                if (card.targetScale > 1) {
                    card.targetScale = 1;
                }
            }
            
            if (card.matchAnimation > 0) {
                card.matchAnimation -= deltaTime * 2;
            }
        });
    },
    
    render(time) {
        this.gl.clearColor(0.06, 0.1, 0.2, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.renderBackground(time);
        this.renderCards(time);
    },
    
    renderBackground(time) {
        this.gl.useProgram(this.backgroundProgram);
        this.gl.disable(this.gl.DEPTH_TEST);
        
        const posLoc = this.gl.getAttribLocation(this.backgroundProgram, 'aPosition');
        const timeLoc = this.gl.getUniformLocation(this.backgroundProgram, 'uTime');
        
        this.gl.uniform1f(timeLoc, time);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bgVertexBuffer);
        this.gl.enableVertexAttribArray(posLoc);
        this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        
        this.gl.enable(this.gl.DEPTH_TEST);
    },
    
    renderCards(time) {
        const theme = Game.currentTheme || 'animals';
        
        this.gl.useProgram(this.cardProgram);
        
        const posLoc = this.gl.getAttribLocation(this.cardProgram, 'aPosition');
        const normalLoc = this.gl.getAttribLocation(this.cardProgram, 'aNormal');
        const texLoc = this.gl.getAttribLocation(this.cardProgram, 'aTexCoord');
        
        const modelLoc = this.gl.getUniformLocation(this.cardProgram, 'uModelMatrix');
        const viewLoc = this.gl.getUniformLocation(this.cardProgram, 'uViewMatrix');
        const projLoc = this.gl.getUniformLocation(this.cardProgram, 'uProjectionMatrix');
        const lightPosLoc = this.gl.getUniformLocation(this.cardProgram, 'uLightPos');
        const viewPosLoc = this.gl.getUniformLocation(this.cardProgram, 'uViewPos');
        const colorLoc = this.gl.getUniformLocation(this.cardProgram, 'uCardColor');
        const isBackLoc = this.gl.getUniformLocation(this.cardProgram, 'uIsBack');
        const isMatchedLoc = this.gl.getUniformLocation(this.cardProgram, 'uIsMatched');
        const textureLoc = this.gl.getUniformLocation(this.cardProgram, 'uTexture');
        
        const aspect = this.width / this.height;
        const projectionMatrix = this.createPerspectiveMatrix(Math.PI / 4, aspect, 0.1, 100);
        const viewMatrix = this.createLookAtMatrix(
            [this.camera.x, this.camera.y, this.camera.z],
            [this.camera.x, this.camera.y, 0],
            [0, 1, 0]
        );
        
        this.gl.uniformMatrix4fv(projLoc, false, projectionMatrix);
        this.gl.uniformMatrix4fv(viewLoc, false, viewMatrix);
        this.gl.uniform3f(lightPosLoc, 0, 5, 5);
        this.gl.uniform3f(viewPosLoc, this.camera.x, this.camera.y, this.camera.z);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cardVertexBuffer);
        this.gl.enableVertexAttribArray(posLoc);
        this.gl.enableVertexAttribArray(normalLoc);
        this.gl.enableVertexAttribArray(texLoc);
        
        const stride = 8 * 4;
        this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, stride, 0);
        this.gl.vertexAttribPointer(normalLoc, 3, this.gl.FLOAT, false, stride, 3 * 4);
        this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, stride, 6 * 4);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cardIndexBuffer);
        
        this.cards.forEach((card, index) => {
            let modelMatrix = this.createIdentityMatrix();
            modelMatrix = this.translateMatrix(modelMatrix, card.x, card.y, card.z);
            modelMatrix = this.rotateYMatrix(modelMatrix, card.rotationY);
            const scale = card.scale * (1 + card.matchAnimation * 0.1);
            modelMatrix = this.scaleMatrix(modelMatrix, scale, scale, 1);
            
            this.gl.uniformMatrix4fv(modelLoc, false, modelMatrix);
            this.gl.uniform1f(isMatchedLoc, card.isMatched ? 1.0 : 0.0);
            
            const isBack = card.rotationY < Math.PI / 2;
            this.gl.uniform1f(isBackLoc, isBack ? 1.0 : 0.0);
            
            if (!isBack && this.textures[theme] && this.textures[theme][card.emojiIndex]) {
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[theme][card.emojiIndex]);
                this.gl.uniform1i(textureLoc, 0);
            }
            
            this.gl.uniform3f(colorLoc, 0.95, 0.95, 1.0);
            this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
        });
    },
    
    createIdentityMatrix() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    
    createPerspectiveMatrix(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ]);
    },
    
    createLookAtMatrix(eye, center, up) {
        const zAxis = this.normalize([
            eye[0] - center[0],
            eye[1] - center[1],
            eye[2] - center[2]
        ]);
        const xAxis = this.normalize(this.cross(up, zAxis));
        const yAxis = this.cross(zAxis, xAxis);
        
        return new Float32Array([
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -this.dot(xAxis, eye), -this.dot(yAxis, eye), -this.dot(zAxis, eye), 1
        ]);
    },
    
    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    },
    
    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    },
    
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },
    
    translateMatrix(m, x, y, z) {
        const result = new Float32Array(m);
        result[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
        result[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
        result[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
        result[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
        return result;
    },
    
    rotateYMatrix(m, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const result = new Float32Array(m);
        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
        
        result[0] = m0 * cos + m8 * (-sin);
        result[1] = m1 * cos + m9 * (-sin);
        result[2] = m2 * cos + m10 * (-sin);
        result[3] = m3 * cos + m11 * (-sin);
        result[8] = m0 * sin + m8 * cos;
        result[9] = m1 * sin + m9 * cos;
        result[10] = m2 * sin + m10 * cos;
        result[11] = m3 * sin + m11 * cos;
        
        return result;
    },
    
    scaleMatrix(m, x, y, z) {
        const result = new Float32Array(m);
        result[0] *= x;
        result[1] *= x;
        result[2] *= x;
        result[3] *= x;
        result[4] *= y;
        result[5] *= y;
        result[6] *= y;
        result[7] *= y;
        result[8] *= z;
        result[9] *= z;
        result[10] *= z;
        result[11] *= z;
        return result;
    }
};
