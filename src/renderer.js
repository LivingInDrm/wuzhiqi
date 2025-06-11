import * as config from './config.js';

export class Renderer {
    constructor(canvas) {
        if (!canvas) {
            throw new Error('Canvas元素不存在');
        }
        
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.ctx) {
            throw new Error('无法获取Canvas 2D上下文');
        }
        
        // 设置Canvas尺寸
        this.canvas.width = config.CANVAS_SIZE;
        this.canvas.height = config.CANVAS_SIZE;
        
        console.log('渲染器初始化成功', {
            canvasSize: config.CANVAS_SIZE,
            boardSize: config.BOARD_SIZE,
            cellSize: config.CELL_SIZE
        });
    }

    drawBoard(board) {
        try {
            this.ctx.clearRect(0, 0, config.CANVAS_SIZE, config.CANVAS_SIZE);
            
            this.ctx.fillStyle = '#DEB887';
            this.ctx.fillRect(0, 0, config.CANVAS_SIZE, config.CANVAS_SIZE);
            
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i < config.BOARD_SIZE; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(config.OFFSET + i * config.CELL_SIZE, config.OFFSET);
                this.ctx.lineTo(config.OFFSET + i * config.CELL_SIZE, config.OFFSET + (config.BOARD_SIZE - 1) * config.CELL_SIZE);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(config.OFFSET, config.OFFSET + i * config.CELL_SIZE);
                this.ctx.lineTo(config.OFFSET + (config.BOARD_SIZE - 1) * config.CELL_SIZE, config.OFFSET + i * config.CELL_SIZE);
                this.ctx.stroke();
            }
            
            this.drawStarPoints();
            this.drawPieces(board);
            
            console.log('棋盘绘制完成');
        } catch (error) {
            console.error('棋盘绘制错误:', error);
        }
    }

    drawStarPoints() {
        const starPoints = [
            [3, 3], [3, 11], [11, 3], [11, 11], [7, 7],
            [3, 7], [11, 7], [7, 3], [7, 11]
        ];
        
        this.ctx.fillStyle = '#8B4513';
        starPoints.forEach(([x, y]) => {
            this.ctx.beginPath();
            this.ctx.arc(
                config.OFFSET + x * config.CELL_SIZE,
                config.OFFSET + y * config.CELL_SIZE,
                3, 0, 2 * Math.PI
            );
            this.ctx.fill();
        });
    }

    drawPieces(board) {
        for (let i = 0; i < config.BOARD_SIZE; i++) {
            for (let j = 0; j < config.BOARD_SIZE; j++) {
                if (board[i][j] !== 0) {
                    this.drawPiece(i, j, board[i][j]);
                }
            }
        }
    }

    drawPiece(row, col, player) {
        const x = config.OFFSET + col * config.CELL_SIZE;
        const y = config.OFFSET + row * config.CELL_SIZE;
        
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, config.PIECE_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, config.PIECE_RADIUS, 0, 2 * Math.PI);
        
        if (player === 1) {
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        } else {
            this.ctx.fillStyle = '#FFF';
            this.ctx.fill();
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        this.ctx.beginPath();
        this.ctx.arc(x - 5, y - 5, 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = player === 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)';
        this.ctx.fill();
    }

    drawWinLine(winInfo) {
        if (!winInfo) return;
        
        const { start, end } = winInfo;
        
        const startX = config.OFFSET + start.col * config.CELL_SIZE;
        const startY = config.OFFSET + start.row * config.CELL_SIZE;
        const endX = config.OFFSET + end.col * config.CELL_SIZE;
        const endY = config.OFFSET + end.row * config.CELL_SIZE;
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    showPreview(row, col, player) {
        const x = config.OFFSET + col * config.CELL_SIZE;
        const y = config.OFFSET + row * config.CELL_SIZE;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, config.PIECE_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = player === 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = player === 1 ? '#333' : '#666';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
} 