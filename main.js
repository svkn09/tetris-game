// ========================================
// テトリスゲーム - メインロジック
// ========================================

// ゲーム定数
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const CELL_SIZE = 30;

// テトリミノの定義（各ブロックの形状）
const TETRIMINOS = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: '#00ffff'
    },
    O: {
        shape: [[1, 1], [1, 1]],
        color: '#ffff00'
    },
    T: {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#ff00ff'
    },
    S: {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: '#00ff00'
    },
    Z: {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: '#ff0000'
    },
    J: {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: '#0000ff'
    },
    L: {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: '#ff8800'
    }
};

// ゲーム状態管理クラス
class TetrisGame {
    constructor() {
        // キャンバス
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');

        // ゲーム状態
        this.grid = this.createGrid();
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;

        // スコア関連
        this.score = 0;
        this.lines = 0;
        this.level = 1;

        // ゲーム制御
        this.isGameRunning = false;
        this.isPaused = false;
        this.gameSpeed = 1000; // ミリ秒

        // タイマー
        this.dropTimer = null;

        // UI要素
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.levelDisplay = document.getElementById('levelDisplay');
        this.linesDisplay = document.getElementById('linesDisplay');
        this.statusDisplay = document.getElementById('statusDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // イベントリスナー
        this.setupEventListeners();

        // 初期化
        this.nextPiece = this.createRandomPiece();
        
        // 初期描画
        this.draw();
    }

    // グリッド初期化
    createGrid() {
        return Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
    }

    // ランダムなテトリミノ生成
    createRandomPiece() {
        const types = Object.keys(TETRIMINOS);
        const type = types[Math.floor(Math.random() * types.length)];
        const tetrimino = TETRIMINOS[type];
        return {
            type,
            shape: this.deepCopy(tetrimino.shape),
            color: tetrimino.color,
            x: Math.floor(GRID_WIDTH / 2) - 1,
            y: 0
        };
    }

    // ディープコピー
    deepCopy(arr) {
        return JSON.parse(JSON.stringify(arr));
    }

    // イベントリスナー設定
    setupEventListeners() {
        // キーボード操作
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // ボタン操作
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    // キーボード操作処理
    handleKeyPress(e) {
        if (!this.isGameRunning || this.isPaused) {
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                e.preventDefault();
                break;
            case 'ArrowUp':
                this.rotatePiece();
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.softDrop();
                e.preventDefault();
                break;
            case ' ':
                this.hardDrop();
                e.preventDefault();
                break;
            case 'z':
            case 'Z':
                this.holdPieceAction();
                e.preventDefault();
                break;
            case 'p':
            case 'P':
                this.togglePause();
                e.preventDefault();
                break;
        }
    }

    // ゲーム開始
    start() {
        if (this.isGameRunning) return;

        this.isGameRunning = true;
        this.isPaused = false;
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createRandomPiece();
        this.canHold = true;

        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.statusDisplay.textContent = 'PLAYING';

        this.startDropTimer();
        this.draw();
    }

    // 一時停止トグル
    togglePause() {
        if (!this.isGameRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            clearInterval(this.dropTimer);
            this.statusDisplay.textContent = 'PAUSED';
        } else {
            this.startDropTimer();
            this.statusDisplay.textContent = 'PLAYING';
        }

        this.draw();
    }

    // リセット
    reset() {
        clearInterval(this.dropTimer);
        this.grid = this.createGrid();
        this.currentPiece = null;
        this.nextPiece = this.createRandomPiece();
        this.holdPiece = null;
        this.canHold = true;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.isGameRunning = false;
        this.isPaused = false;
        this.gameSpeed = 1000;

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.statusDisplay.textContent = 'READY';

        this.updateDisplay();
        this.draw();
    }

    // ドロップタイマー開始
    startDropTimer() {
        this.dropTimer = setInterval(() => {
            if (!this.isPaused) {
                this.dropPiece();
            }
        }, this.gameSpeed);
    }

    // ブロック移動
    movePiece(dx, dy) {
        if (!this.currentPiece) return;

        this.currentPiece.x += dx;
        this.currentPiece.y += dy;

        if (!this.isValidPosition(this.currentPiece)) {
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
            return false;
        }

        this.draw();
        return true;
    }

    // ソフトドロップ
    softDrop() {
        if (this.movePiece(0, 1)) {
            this.score += 1;
        }
    }

    // ハードドロップ
    hardDrop() {
        let dropDistance = 0;
        while (this.movePiece(0, 1)) {
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.lockPiece();
    }

    // ブロック回転
    rotatePiece() {
        if (!this.currentPiece) return;

        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = this.rotateShape(this.currentPiece.shape);

        if (!this.isValidPosition(this.currentPiece)) {
            this.currentPiece.shape = originalShape;
            return;
        }

        this.draw();
    }

    // 形状回転（時計回り）
    rotateShape(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                rotated[c][rows - 1 - r] = shape[r][c];
            }
        }

        return rotated;
    }

    // ホールド機能
    holdPieceAction() {
        if (!this.canHold || !this.currentPiece) return;

        const temp = this.currentPiece;
        this.currentPiece = this.holdPiece;

        if (this.currentPiece) {
            this.currentPiece.x = Math.floor(GRID_WIDTH / 2) - 1;
            this.currentPiece.y = 0;
        } else {
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.createRandomPiece();
        }

        this.holdPiece = temp;
        this.holdPiece.x = Math.floor(GRID_WIDTH / 2) - 1;
        this.holdPiece.y = 0;
        this.canHold = false;

        this.draw();
    }

    // 位置の妥当性チェック
    isValidPosition(piece) {
        const shape = piece.shape;
        const x = piece.x;
        const y = piece.y;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 0) continue;

                const gridX = x + c;
                const gridY = y + r;

                // 境界チェック
                if (gridX < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
                    return false;
                }

                // グリッド衝突チェック
                if (gridY >= 0 && this.grid[gridY][gridX] !== 0) {
                    return false;
                }
            }
        }

        return true;
    }

    // ブロック自動落下
    dropPiece() {
        if (!this.currentPiece) {
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.createRandomPiece();
            this.canHold = true;

            if (!this.isValidPosition(this.currentPiece)) {
                this.gameOver();
                return;
            }
        }

        if (!this.movePiece(0, 1)) {
            this.lockPiece();
        }
    }

    // ブロック固定
    lockPiece() {
        if (!this.currentPiece) return;

        const shape = this.currentPiece.shape;
        const x = this.currentPiece.x;
        const y = this.currentPiece.y;
        const color = this.currentPiece.color;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 0) continue;

                const gridX = x + c;
                const gridY = y + r;

                if (gridY >= 0) {
                    this.grid[gridY][gridX] = color;
                }
            }
        }

        this.currentPiece = null;
        this.clearLines();
        this.draw();
    }

    // ライン消去
    clearLines() {
        let linesCleared = 0;

        for (let r = GRID_HEIGHT - 1; r >= 0; r--) {
            if (this.grid[r].every(cell => cell !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(GRID_WIDTH).fill(0));
                linesCleared++;
                r++; // 削除後、同じ行をもう一度チェック
            }
        }

        if (linesCleared > 0) {
            this.addScore(linesCleared);
        }
    }

    // スコア加算
    addScore(linesCleared) {
        const scoreTable = {
            1: 100,
            2: 300,
            3: 500,
            4: 800
        };

        const lineScore = scoreTable[linesCleared] || 0;
        this.score += lineScore * this.level;
        this.lines += linesCleared;

        // レベルアップ判定（10ライン毎）
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.gameSpeed = Math.max(100, 1000 - (this.level - 1) * 100);
            clearInterval(this.dropTimer);
            this.startDropTimer();
        }

        this.updateDisplay();
    }

    // ゲームオーバー
    gameOver() {
        this.isGameRunning = false;
        clearInterval(this.dropTimer);
        this.statusDisplay.textContent = 'GAME OVER';
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;

        this.showGameOverModal();
    }

    // ゲームオーバーモーダル表示
    showGameOverModal() {
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        modal.innerHTML = `
            <div class="game-over-content">
                <h2>GAME OVER</h2>
                <p>スコア</p>
                <div class="final-score">${this.score}</div>
                <p>レベル: ${this.level}</p>
                <p>消したライン: ${this.lines}</p>
                <p style="margin-top: 20px; font-size: 0.9rem;">STARTボタンを押して再度プレイしてください</p>
            </div>
        `;

        document.body.appendChild(modal);

        // クリックでモーダル閉じる
        modal.addEventListener('click', () => {
            modal.remove();
        });
    }

    // 表示更新
    updateDisplay() {
        this.scoreDisplay.textContent = this.score;
        this.levelDisplay.textContent = this.level;
        this.linesDisplay.textContent = this.lines;
    }

    // 描画
    draw() {
        // ゲームボード描画
        this.drawBoard();

        // 次のブロック描画
        this.drawNextPiece();

        // ホールド描画
        this.drawHoldPiece();
    }

    // ゲームボード描画
    drawBoard() {
        // 背景
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッドラインを描画
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 0.5;

        for (let r = 0; r <= GRID_HEIGHT; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * CELL_SIZE);
            this.ctx.lineTo(this.canvas.width, r * CELL_SIZE);
            this.ctx.stroke();
        }

        for (let c = 0; c <= GRID_WIDTH; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * CELL_SIZE, 0);
            this.ctx.lineTo(c * CELL_SIZE, this.canvas.height);
            this.ctx.stroke();
        }

        // グリッド上のブロック描画
        for (let r = 0; r < GRID_HEIGHT; r++) {
            for (let c = 0; c < GRID_WIDTH; c++) {
                if (this.grid[r][c] !== 0) {
                    this.drawCell(this.ctx, c, r, this.grid[r][c]);
                }
            }
        }

        // 現在のピース描画
        if (this.currentPiece) {
            this.drawPiece(this.ctx, this.currentPiece);
        }

        // ゲーム一時停止中の表示
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    // セル描画
    drawCell(ctx, x, y, color) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        ctx.fillStyle = color;
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        // ハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // ピース描画
    drawPiece(ctx, piece) {
        const shape = piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 0) continue;
                this.drawCell(ctx, piece.x + c, piece.y + r, piece.color);
            }
        }
    }

    // 次のピース描画
    drawNextPiece() {
        this.nextCtx.fillStyle = '#0a0a0a';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPiece) {
            const shape = this.nextPiece.shape;
            const offsetX = (4 - shape[0].length) * 15;
            const offsetY = (4 - shape.length) * 15;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] === 0) continue;
                    const x = offsetX + c * 30;
                    const y = offsetY + r * 30;
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(x + 1, y + 1, 28, 28);
                    this.nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(x + 1, y + 1, 28, 28);
                }
            }
        }
    }

    // ホールドピース描画
    drawHoldPiece() {
        this.holdCtx.fillStyle = '#0a0a0a';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (this.holdPiece) {
            const shape = this.holdPiece.shape;
            const offsetX = (4 - shape[0].length) * 15;
            const offsetY = (4 - shape.length) * 15;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] === 0) continue;
                    const x = offsetX + c * 30;
                    const y = offsetY + r * 30;
                    this.holdCtx.fillStyle = this.holdPiece.color;
                    this.holdCtx.fillRect(x + 1, y + 1, 28, 28);
                    this.holdCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    this.holdCtx.lineWidth = 1;
                    this.holdCtx.strokeRect(x + 1, y + 1, 28, 28);
                }
            }
        }
    }
}

// ゲーム初期化 - 複数の方法で確実に実行
function initializeGame() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.game = new TetrisGame();
        });
    } else {
        window.game = new TetrisGame();
    }
}

// 初期化実行
initializeGame();
