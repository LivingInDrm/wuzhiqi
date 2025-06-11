import { BOARD_SIZE } from './config.js';

/**
 * 进阶AI算法类
 * 实现复杂威胁模式识别、多步预判、精细化评估等高级功能
 */
export class AdvancedAI {
    constructor(gameLogic, difficulty = 'advanced') {
        this.game = gameLogic;
        this.board = this.game.board;
        this.difficulty = difficulty;
        
        // 置换表用于存储已计算的位置
        this.transpositionTable = new Map();
        
        // 初始化难度配置
        this.initDifficultyConfigs();
        
        // 根据难度设置当前配置
        this.config = this.difficulties[difficulty] || this.difficulties.beginner;
        

    }

    /**
     * 初始化不同难度的配置参数
     */
    initDifficultyConfigs() {
        this.difficulties = {
            // 入门级 - 最低难度，适合新手练习
            beginner: {
                maxSearchDepth: 3,
                minSearchDepth: 1,
                threatThreshold: 800,
                multiThreatMinCount: 2,
                movesCandidates: 8,
                weights: {
                    threat: 0.6,
                    control: 0.15,
                    connect: 0.1,
                    defense: 0.1,
                    pattern: 0.1
                },
                threatValues: {
                    FIVE: 20000,
                    OPEN_FOUR: 4000,
                    SIMPLE_FOUR: 400,
                    OPEN_THREE: 200,
                    BROKEN_THREE: 40,
                    OPEN_TWO: 20,
                    SIMPLE_TWO: 5
                }
            },
            
                         // 进阶级 - 当前水平
             advanced: {
                 maxSearchDepth: 6,
                 minSearchDepth: 3,
                 threatThreshold: 300,
                 multiThreatMinCount: 1,
                movesCandidates: 15,
                weights: {
                    threat: 1.0,
                    control: 0.3,
                    connect: 0.2,
                    defense: 0.25,
                    pattern: 0.25
                },
                threatValues: {
                    FIVE: 50000,
                    OPEN_FOUR: 10000,
                    SIMPLE_FOUR: 1000,
                    OPEN_THREE: 500,
                    BROKEN_THREE: 100,
                    OPEN_TWO: 50,
                    SIMPLE_TWO: 10
                }
            },
            
            // 专业级 - 最高级别，集成多种高级功能
            professional: {
                maxSearchDepth: 10,
                minSearchDepth: 4,
                threatThreshold: 300,
                multiThreatMinCount: 1,
                movesCandidates: 25,
                enableVCT: true,      // 启用算杀
                weights: {
                    threat: 2.0,
                    control: 0.5,
                    connect: 0.4,
                    defense: 0.5,
                    pattern: 0.6,
                    shape: 0.3        // 启用形状评估
                },
                threatValues: {
                    FIVE: 1000000,
                    OPEN_FOUR: 100000,
                    DOUBLE_FOUR: 80000,   // 双四必胜
                    DOUBLE_THREE: 50000,  // 双三威胁
                    SIMPLE_FOUR: 10000,
                    BROKEN_FOUR: 5000,    // 眠四
                    OPEN_THREE: 2000,
                    JUMP_THREE: 1500,     // 跳三
                    BROKEN_THREE: 400,
                    DOUBLE_TWO: 300,      // 双二
                    OPEN_TWO: 200,
                    SIMPLE_TWO: 50
                }
            }
        };
    }

    // =================进阶AI主入口=================
    
    /**
     * 进阶难度AI决策主函数
     */
    getAdvancedMove() {
        this.board = this.game.board; // 同步棋盘状态
        
        // 清理置换表（避免内存泄漏）
        if (this.transpositionTable.size > 10000) {
            this.transpositionTable.clear();
        }
        
        const winningMove = this.findWinningMove(2);
        if (winningMove) {
            return winningMove;
        }
        
        const blockingMove = this.findWinningMove(1);
        if (blockingMove) {
            return blockingMove;
        }
        
        const urgentDefense = this.findUrgentThreatDefense(1);
        if (urgentDefense) {
            return urgentDefense;
        }
        
        const combinedThreats = this.findCombinedThreats(2);
        if (combinedThreats.length > 0) {
            return this.selectBestCombinedThreat(combinedThreats);
        }
        
        const multiDefense = this.findMultiThreatDefense();
        if (multiDefense) {
            return multiDefense;
        }
        
        const forcingMove = this.findForcingThreat(2);
        if (forcingMove) {
            return forcingMove;
        }
        
        const forcingDefense = this.findForcingThreat(1);
        if (forcingDefense) {
            return forcingDefense;
        }
        
        const strategicThreat = this.findStrategicThreatSetup(2);
        if (strategicThreat) {
            return strategicThreat;
        }
        
        const bestMove = this.getAdvancedMinimax();
        
        return bestMove || this.getStrategicMove();
    }

    // =================紧急威胁防守系统=================
    
    /**
     * 寻找紧急威胁防守（活四、冲四等）
     */
    findUrgentThreatDefense(player) {
        const urgentThreats = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, player);
                    
                    // 识别紧急威胁：活四、冲四、强活三
                    if (threat.forcing && (
                        threat.name === '活四' || 
                        threat.name === '冲四' ||
                        (threat.name === '活三' && threat.value >= 500)
                    )) {
                        urgentThreats.push({
                            move: { row, col },
                            threat: threat,
                            priority: this.getUrgentPriority(threat)
                        });
                    }
                }
            }
        }
        
        if (urgentThreats.length > 0) {
            // 按优先级排序，活四 > 冲四 > 活三
            urgentThreats.sort((a, b) => b.priority - a.priority);
            return urgentThreats[0].move;
        }
        
        return null;
    }
    
    /**
     * 获取紧急威胁的优先级
     */
    getUrgentPriority(threat) {
        if (threat.name === '活四') return 10000;
        if (threat.name === '冲四') return 5000;
        if (threat.name === '活三') return threat.value;
        return 0;
    }
    
    /**
     * 寻找强制威胁（活三以上的攻击机会）
     */
    findForcingThreat(player) {
        const forcingThreats = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, player);
                    
                    // 强制威胁：活三以上且forcing=true
                    if (threat.forcing && threat.value >= 300) {
                        forcingThreats.push({
                            move: { row, col },
                            value: threat.value,
                            name: threat.name
                        });
                    }
                }
            }
        }
        
        if (forcingThreats.length > 0) {
            // 按威胁价值排序
            forcingThreats.sort((a, b) => b.value - a.value);
            return forcingThreats[0].move;
        }
        
        return null;
    }

    // =================多重威胁识别系统=================
    
    /**
     * 寻找能创造多个威胁的走法
     */
    findCombinedThreats(player) {
        const combinedThreats = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threatAnalysis = this.analyzeCombinedThreats(row, col, player);
                    
                    if (threatAnalysis.threatCount >= this.config.multiThreatMinCount) {
                        combinedThreats.push({
                            move: { row, col },
                            threatCount: threatAnalysis.threatCount, 
                            threatTypes: threatAnalysis.threatTypes,
                            totalValue: threatAnalysis.totalValue
                        });
                    }
                }
            }
        }
        
        // 按威胁价值排序
        return combinedThreats.sort((a, b) => b.totalValue - a.totalValue);
    }
    
    /**
     * 分析单个位置的多重威胁
     */
    analyzeCombinedThreats(row, col, player) {
        // 临时下子
        this.board[row][col] = player;
        
        const threats = [];
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        // 分析每个方向的威胁
        for (const [dx, dy] of directions) {
            const threat = this.analyzeThreatInDirection(row, col, dx, dy, player);
            if (threat.value > 0) {
                threats.push(threat);
            }
        }
        
        // 恢复棋盘
        this.board[row][col] = 0;
        
        // 计算真正的威胁数量（包括较弱的威胁）
        const forcingThreats = threats.filter(t => t.forcing).length;
        const significantThreats = threats.filter(t => t.value >= 50).length;
        
        return {
            threatCount: Math.max(forcingThreats, Math.floor(significantThreats / 2)),
            threatTypes: threats,
            totalValue: threats.reduce((sum, t) => sum + t.value, 0),
            forcingCount: forcingThreats,
            significantCount: significantThreats
        };
    }
    
    /**
     * 选择最佳的多重威胁走法
     */
    selectBestCombinedThreat(combinedThreats) {
        // 优先选择有活四的组合威胁
        const openFourThreats = combinedThreats.filter(t => 
            t.threatTypes.some(type => type.name === '活四')
        );
        
        if (openFourThreats.length > 0) {
            return openFourThreats[0].move;
        }
        
        // 其次选择多个冲四的组合
        const multipleFours = combinedThreats.filter(t => 
            t.threatTypes.filter(type => type.name.includes('四')).length >= 2
        );
        
        if (multipleFours.length > 0) {
            return multipleFours[0].move;
        }
        
        // 默认返回总价值最高的
        return combinedThreats[0].move;
    }

    // =================威胁序列预判系统=================
    
    /**
     * 寻找战略威胁布局（为未来威胁做准备）
     */
    findStrategicThreatSetup(player) {
        const strategicMoves = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const strategicValue = this.evaluateStrategicValue(row, col, player);
                    
                    if (strategicValue > this.config.threatThreshold) {
                        strategicMoves.push({
                            move: { row, col },
                            value: strategicValue
                        });
                    }
                }
            }
        }
        
        if (strategicMoves.length > 0) {
            strategicMoves.sort((a, b) => b.value - a.value);
            return strategicMoves[0].move;
        }
        
        return null;
    }
    
    /**
     * 评估位置的战略价值（考虑未来威胁潜力）
     */
    evaluateStrategicValue(row, col, player) {
        // 模拟下这一步
        this.board[row][col] = player;
        
        let strategicValue = 0;
        
        // 分析下一步可能创造的威胁
        const futureThreats = this.analyzeNextStepThreats(player);
        strategicValue += futureThreats.maxThreatValue * 0.7;
        
        // 分析位置控制价值
        const controlValue = this.evaluatePositionalControl(row, col, player);
        strategicValue += controlValue * 0.3;
        
        // 分析连接价值
        const connectValue = this.evaluateConnectivity(row, col, player);
        strategicValue += connectValue * 0.4;
        
        // 恢复棋盘
        this.board[row][col] = 0;
        
        return strategicValue;
    }
    
    /**
     * 分析下一步可能的威胁
     */
    analyzeNextStepThreats(player) {
        let maxThreatValue = 0;
        let threatCount = 0;
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, player);
                    if (threat.value > maxThreatValue) {
                        maxThreatValue = threat.value;
                    }
                    if (threat.forcing) {
                        threatCount++;
                    }
                }
            }
        }
        
        return { maxThreatValue, threatCount };
    }

    // =================多重威胁防守系统=================
    
    /**
     * 寻找多重威胁防守
     */
    findMultiThreatDefense() {
        const opponentThreats = this.findCombinedThreats(1);
        
        if (opponentThreats.length > 0) {
            // 如果对手有多重威胁，寻找最佳防守
            return this.findBestMultiDefense(opponentThreats);
        }
        
        return null;
    }
    
    /**
     * 寻找最佳多重防守策略
     */
    findBestMultiDefense(opponentThreats) {
        const defenseOptions = [];
        
        for (const threat of opponentThreats) {
            // 对每个威胁位置，分析防守价值
            const defenseValue = this.evaluateDefenseValue(threat);
            defenseOptions.push({
                move: threat.move,
                defenseValue: defenseValue,
                originalThreat: threat
            });
        }
        
        // 选择防守价值最高的
        defenseOptions.sort((a, b) => b.defenseValue - a.defenseValue);
        
        if (defenseOptions.length > 0) {
            return defenseOptions[0].move;
        }
        
        return null;
    }
    
    /**
     * 评估防守价值
     */
    evaluateDefenseValue(threat) {
        let defenseValue = threat.totalValue; // 基础防守价值等于威胁价值
        
        // 如果能同时创造自己的威胁，增加价值
        const counterThreat = this.analyzeCombinedThreats(threat.move.row, threat.move.col, 2);
        defenseValue += counterThreat.totalValue * 0.5;
        
        return defenseValue;
    }

    // =================增强版Minimax搜索=================
    
    /**
     * 增强版minimax搜索
     */
    getAdvancedMinimax() {
        const depth = this.getAdvancedSearchDepth();
        const moves = this.getAdvancedOrderedMoves(2);
        const result = this.advancedMinimaxWithPruning(depth, 2, -Infinity, Infinity, true);
        return result.move;
    }
    
    /**
     * 动态搜索深度计算
     */
    getAdvancedSearchDepth() {
        const pieceCount = this.getPieceCount();
        const threatCount = this.countActiveThreat();
        
        // 开局阶段 - 浅搜索
        if (pieceCount < 10) return this.config.minSearchDepth;
        
        // 中局有威胁 - 深搜索
        if (threatCount > 2) return this.config.maxSearchDepth;
        
        // 中后期 - 中等深度
        if (pieceCount < 50) return this.config.minSearchDepth + 1;
        
        // 残局 - 深搜索
        return this.config.maxSearchDepth - 1;
    }
    
    /**
     * 带剪枝的增强版minimax
     */
    advancedMinimaxWithPruning(depth, player, alpha, beta, isMaximizing) {
        // 检查置换表
        const positionKey = this.getBoardHash();
        if (this.transpositionTable.has(positionKey)) {
            const cached = this.transpositionTable.get(positionKey);
            if (cached.depth >= depth) {
                return cached;
            }
        }
        
        // 终止条件
        if (depth === 0 || this.isGameEnd()) {
            const score = this.evaluateAdvancedPosition();
            const result = { score, move: null, depth };
            this.transpositionTable.set(positionKey, result);
            return result;
        }
        
        const moves = this.getAdvancedOrderedMoves(player);
        let bestMove = null;
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            
            for (const move of moves) {
                this.board[move.row][move.col] = player;
                
                const result = this.advancedMinimaxWithPruning(
                    depth - 1, 3 - player, alpha, beta, false
                );
                
                this.board[move.row][move.col] = 0;
                
                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break; // Alpha-Beta剪枝
            }
            
            const result = { score: maxScore, move: bestMove, depth };
            this.transpositionTable.set(positionKey, result);
            return result;
        } else {
            let minScore = Infinity;
            
            for (const move of moves) {
                this.board[move.row][move.col] = player;
                
                const result = this.advancedMinimaxWithPruning(
                    depth - 1, 3 - player, alpha, beta, true
                );
                
                this.board[move.row][move.col] = 0;
                
                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                
                beta = Math.min(beta, result.score);
                if (beta <= alpha) break; // Alpha-Beta剪枝
            }
            
            const result = { score: minScore, move: bestMove, depth };
            this.transpositionTable.set(positionKey, result);
            return result;
        }
    }

    // =================增强版评估系统=================
    
    /**
     * 增强版局面评估 - 使用配置化权重
     */
    evaluateAdvancedPosition() {
        let score = 0;
        const weights = this.config.weights;
        
        // 威胁评估（主要因素）
        const threatScore2 = this.evaluatePlayerThreats(2);
        const threatScore1 = this.evaluatePlayerThreats(1);
        const threatDiff = threatScore2 - threatScore1;
        score += threatDiff * weights.threat;
        
        // 位置控制评估
        const controlScore2 = this.evaluateOverallControl(2);
        const controlScore1 = this.evaluateOverallControl(1);
        const controlDiff = controlScore2 - controlScore1;
        score += controlDiff * weights.control;
        
        // 连接性评估
        const connectScore2 = this.evaluateOverallConnectivity(2);
        const connectScore1 = this.evaluateOverallConnectivity(1);
        const connectDiff = connectScore2 - connectScore1;
        score += connectDiff * weights.connect;
        
        // 防守评估（专业级以上）
        if (weights.defense) {
            const defenseScore2 = this.evaluateDefensivePosition(2);
            const defenseScore1 = this.evaluateDefensivePosition(1);
            const defenseDiff = defenseScore2 - defenseScore1;
            score += defenseDiff * weights.defense;
        }
        
        // 模式评估（专业级以上）
        if (weights.pattern) {
            const patternScore2 = this.evaluatePatternValue(2);
            const patternScore1 = this.evaluatePatternValue(1);
            const patternDiff = patternScore2 - patternScore1;
            score += patternDiff * weights.pattern;
        }
        
        // 形状评估（专业级）
        if (weights.shape) {
            const shapeScore2 = this.evaluateShapeValue(2);
            const shapeScore1 = this.evaluateShapeValue(1);
            const shapeDiff = shapeScore2 - shapeScore1;
            score += shapeDiff * weights.shape;
        }
        
        return score;
    }
    
    /**
     * 评估防守位置价值
     */
    evaluateDefensivePosition(player) {
        let defenseValue = 0;
        const opponentPlayer = 3 - player;
        
        // 检查所有对手的威胁点
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, opponentPlayer);
                    if (threat.forcing) {
                        // 如果我方可以在这里下子进行防守
                        const defenseThreat = this.analyzeThreatAtPosition(row, col, player);
                        defenseValue += Math.min(threat.value * 0.8, defenseThreat.value * 0.3);
                    }
                }
            }
        }
        
        return defenseValue;
    }
    
    /**
     * 评估棋型模式价值
     */
    evaluatePatternValue(player) {
        let patternValue = 0;
        
        // 检查双威胁模式
        const multiThreats = this.findCombinedThreats(player);
        for (const threat of multiThreats) {
            if (threat.threatCount >= 2) {
                patternValue += threat.totalValue * 0.5;
            }
        }
        
        // 检查连续威胁模式
        patternValue += this.evaluateContinuousThreats(player);
        
        return patternValue;
    }
    
    /**
     * 评估形状价值（专家级）
     */
    evaluateShapeValue(player) {
        let shapeValue = 0;
        
        // 评估棋子间的几何关系
        const pieces = this.getPiecePositions(player);
        
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const distance = this.getDistance(pieces[i], pieces[j]);
                if (distance <= 4) { // 有效影响范围
                    shapeValue += Math.max(0, 5 - distance);
                }
            }
        }
        
        return shapeValue;
    }
    
    /**
     * 评估节奏价值（大师级）
     */
    evaluateTempoValue() {
        const moveCount = this.getPieceCount();
        let tempoValue = 0;
        
        // 开局控制中心优势
        if (moveCount < 10) {
            const centerControl = this.evaluateCenterControl();
            tempoValue += centerControl * 2;
        }
        
        // 中局威胁节奏
        if (moveCount >= 10 && moveCount < 50) {
            const threatTempo = this.evaluateThreatTempo();
            tempoValue += threatTempo;
        }
        
        return tempoValue;
    }
    
    /**
     * 评估连续威胁
     */
    evaluateContinuousThreats(player) {
        let value = 0;
        const threats = this.findAllPlayerThreats(player);
        
        // 检查是否有威胁序列
        for (let i = 0; i < threats.length - 1; i++) {
            for (let j = i + 1; j < threats.length; j++) {
                const distance = this.getDistance(threats[i].move, threats[j].move);
                if (distance <= 3) {
                    value += (threats[i].value + threats[j].value) * 0.2;
                }
            }
        }
        
        return value;
    }
    
    /**
     * 获取玩家所有棋子位置
     */
    getPiecePositions(player) {
        const positions = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === player) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    /**
     * 计算两点距离
     */
    getDistance(pos1, pos2) {
        return Math.max(Math.abs(pos1.row - pos2.row), Math.abs(pos1.col - pos2.col));
    }
    
    /**
     * 评估中心控制
     */
    evaluateCenterControl() {
        const center = Math.floor(BOARD_SIZE / 2);
        let centerValue = 0;
        
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const r = center + dr;
                const c = center + dc;
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (this.board[r][c] === 2) {
                        centerValue += (3 - Math.max(Math.abs(dr), Math.abs(dc)));
                    } else if (this.board[r][c] === 1) {
                        centerValue -= (3 - Math.max(Math.abs(dr), Math.abs(dc)));
                    }
                }
            }
        }
        
        return centerValue;
    }
    
    /**
     * 评估威胁节奏
     */
    evaluateThreatTempo() {
        const myThreats = this.findAllPlayerThreats(2);
        const opponentThreats = this.findAllPlayerThreats(1);
        
        // 主动权评估：我方威胁多且强
        let tempo = myThreats.length * 10 - opponentThreats.length * 8;
        
        // 强制性威胁更有价值
        const myForcing = myThreats.filter(t => t.forcing).length;
        const opponentForcing = opponentThreats.filter(t => t.forcing).length;
        tempo += myForcing * 50 - opponentForcing * 40;
        
        return tempo;
    }
    
    /**
     * 找到玩家所有威胁
     */
    findAllPlayerThreats(player) {
        const threats = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, player);
                    if (threat.value > 0) {
                        threats.push({
                            move: { row, col },
                            value: threat.value,
                            forcing: threat.forcing,
                            name: threat.name
                        });
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * 评估玩家的威胁总价值
     */
    evaluatePlayerThreats(player) {
        let threatValue = 0;
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat = this.analyzeThreatAtPosition(row, col, player);
                    threatValue += threat.value;
                }
            }
        }
        
        return threatValue;
    }
    
    /**
     * 评估整体位置控制
     */
    evaluateOverallControl(player) {
        let controlValue = 0;
        const centerRow = Math.floor(BOARD_SIZE / 2);
        const centerCol = Math.floor(BOARD_SIZE / 2);
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === player) {
                    // 距离中心越近价值越高
                    const distance = Math.abs(row - centerRow) + Math.abs(col - centerCol);
                    controlValue += Math.max(1, BOARD_SIZE - distance);
                }
            }
        }
        
        return controlValue;
    }
    
    /**
     * 评估整体连接性
     */
    evaluateOverallConnectivity(player) {
        let connectValue = 0;
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === player) {
                    connectValue += this.evaluateConnectivity(row, col, player);
                }
            }
        }
        
        return connectValue;
    }

    // =================移动排序优化=================
    
    /**
     * 获取优化排序的移动列表
     */
    getAdvancedOrderedMoves(player) {
        const moves = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const moveValue = this.evaluateMoveValue(row, col, player);
                    moves.push({
                        row, col,
                        value: moveValue.total,
                        threatValue: moveValue.threat,
                        controlValue: moveValue.control,
                        centerDistance: this.getCenterDistance(row, col)
                    });
                }
            }
        }
        
        // 多因素排序
        return moves.sort((a, b) => {
            // 1. 威胁价值优先
            const threatDiff = b.threatValue - a.threatValue;
            if (Math.abs(threatDiff) > 100) return threatDiff;
            
            // 2. 总价值
            const valueDiff = b.value - a.value;
            if (Math.abs(valueDiff) > 50) return valueDiff;
            
            // 3. 位置控制
            const controlDiff = b.controlValue - a.controlValue;
            if (Math.abs(controlDiff) > 20) return controlDiff;
            
            // 4. 中心距离
            return a.centerDistance - b.centerDistance;
        }).slice(0, this.config.movesCandidates || 15); // 使用配置的候选数量
    }
    
    /**
     * 评估移动价值
     */
    evaluateMoveValue(row, col, player) {
        const threat = this.analyzeThreatAtPosition(row, col, player);
        const control = this.evaluatePositionalControl(row, col, player);
        const connect = this.evaluateConnectivity(row, col, player);
        
        return {
            threat: threat.value,
            control: control,
            connect: connect,
            total: threat.value + control * 0.3 + connect * 0.2
        };
    }

    // =================辅助工具函数=================
    
    /**
     * 分析位置威胁 - 修复版本（支持全8方向）
     */
    analyzeThreatAtPosition(row, col, player) {
        this.board[row][col] = player;
        
        let maxThreat = { value: 0, forcing: false, name: '无威胁' };
        // 修复：检查4个主要方向，每个方向会检查正反两个方向的连线
        const directions = [
            [0, 1],   // 水平（左右）
            [1, 0],   // 垂直（上下）
            [1, 1],   // 右下左上斜对角
            [1, -1]   // 左下右上斜对角
        ];
        
        for (const [dx, dy] of directions) {
            const threat = this.analyzeThreatInDirection(row, col, dx, dy, player);
            if (threat.value > maxThreat.value) {
                maxThreat = threat;
            }
        }
        
        // 对于进阶级以上，额外检测跨方向的多重威胁
        if (this.difficulty !== 'beginner') {
            const multiThreatAnalysis = this.analyzeMultiDirectionThreats(row, col, player);
            if (multiThreatAnalysis.value > maxThreat.value) {
                maxThreat = multiThreatAnalysis;
            }
        }
        
        // 恢复棋盘
        this.board[row][col] = 0;
        
        return maxThreat;
    }
    
    /**
     * 分析跨方向多重威胁（专业级以上功能）
     */
    analyzeMultiDirectionThreats(row, col, player) {
        const values = this.config.threatValues;
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直  
            [1, 1],   // 右下左上对角
            [1, -1]   // 左下右上对角
        ];
        
        const threats = [];
        
        // 分析每个方向的威胁
        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, 9);
            const threat = this.classifyThreat(pattern, player);
            if (threat.value > 0) {
                threats.push(threat);
            }
        }
        
        // 检测双三组合
        const activeThrees = threats.filter(t => t.name === '活三');
        if (activeThrees.length >= 2) {
            return {
                value: values.DOUBLE_THREE || 20000,
                forcing: true,
                name: '双三威胁'
            };
        }
        
        // 检测活三+冲四组合
        const hasActiveThree = threats.some(t => t.name === '活三');
        const hasFour = threats.some(t => t.name.includes('四'));
        if (hasActiveThree && hasFour) {
            return {
                value: (values.DOUBLE_THREE || 20000) * 0.8,
                forcing: true,
                name: '三四组合'
            };
        }
        
        // 检测多个冲四组合
        const fours = threats.filter(t => t.name.includes('四'));
        if (fours.length >= 2) {
            return {
                value: values.DOUBLE_FOUR || 80000,
                forcing: true,
                name: '双四威胁'
            };
        }
        
        // 返回最强单一威胁
        const bestThreat = threats.reduce((best, current) => 
            current.value > best.value ? current : best,
            { value: 0, forcing: false, name: '无威胁' }
        );
        
        return bestThreat;
    }
    
    /**
     * 分析方向威胁
     */
    analyzeThreatInDirection(row, col, dx, dy, player) {
        const line = this.getLinePattern(row, col, dx, dy, 9);
        return this.classifyThreat(line, player);
    }
    
    /**
     * 获取线性模式
     */
    getLinePattern(row, col, dx, dy, length) {
        const pattern = [];
        const half = Math.floor(length / 2);
        
        for (let i = -half; i <= half; i++) {
            const r = row + i * dx;
            const c = col + i * dy;
            
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                pattern.push(this.board[r][c]);
            } else {
                pattern.push(-1); // 边界
            }
        }
        
        return pattern;
    }
    
    /**
     * 威胁分类 - 使用配置化的威胁值
     */
    classifyThreat(pattern, player) {
        const centerIndex = Math.floor(pattern.length / 2);
        const { count, leftOpen, rightOpen } = this.countConsecutive(pattern, centerIndex, player);
        const values = this.config.threatValues;
        
        // 首先检测特殊威胁模式（进阶级以上，但进阶级仅检测基础特殊威胁）
        if (this.difficulty !== 'beginner') {
            const specialThreats = this.detectSpecialThreats(pattern, centerIndex, player);
            if (specialThreats.length > 0) {
                // 返回最高价值的特殊威胁
                const bestSpecialThreat = specialThreats.reduce((best, current) => 
                    current.value > best.value ? current : best
                );
                return bestSpecialThreat;
            }
        }
        
        // 五连
        if (count >= 5) {
            return { value: values.FIVE || 50000, forcing: true, name: '五连' };
        }
        
        // 活四
        if (count === 4 && leftOpen && rightOpen) {
            return { value: values.OPEN_FOUR || 10000, forcing: true, name: '活四' };
        }
        
        // 冲四/眠四
        if (count === 4) {
            if (leftOpen || rightOpen) {
                return { value: values.SIMPLE_FOUR || 1000, forcing: true, name: '冲四' };
            } else {
                return { value: values.BROKEN_FOUR || 500, forcing: true, name: '眠四' };
            }
        }
        
        // 活三
        if (count === 3 && leftOpen && rightOpen) {
            const threateValue = values.OPEN_THREE || 500;
            return { value: threateValue, forcing: true, name: '活三' };
        }
        
        // 跳三检测（进阶级以上启用）
        if (count === 3 && this.difficulty !== 'beginner') {
            const jumpThree = this.detectJumpThree(pattern, centerIndex, player);
            if (jumpThree) {
                const jumpValue = this.difficulty === 'advanced' ? 200 : (values.JUMP_THREE || 1500);
                return { value: jumpValue, forcing: true, name: '跳三' };
            }
        }
        
        // 眠三
        if (count === 3) {
            return { value: values.BROKEN_THREE || 100, forcing: true, name: '眠三' };
        }
        
        // 活二
        if (count === 2 && leftOpen && rightOpen) {
            return { value: values.OPEN_TWO || 50, forcing: false, name: '活二' };
        }
        
        // 眠二
        if (count === 2) {
            return { value: values.SIMPLE_TWO || 10, forcing: false, name: '眠二' };
        }
        
        return { value: 0, forcing: false, name: '无威胁' };
    }
    
    /**
     * 检测跳三模式（专业级以上功能）
     */
    detectJumpThree(pattern, centerIndex, player) {
        if (pattern.length < 7) return false;
        
        // 检测 _XX_X_ 或 _X_XX_ 模式
        const checkPattern = (offset) => {
            const indices = [-2, -1, 0, 1, 2].map(i => centerIndex + i + offset);
            return indices.every(i => i >= 0 && i < pattern.length);
        };
        
        // 模式1: _XX_X_
        if (checkPattern(-1)) {
            const p = pattern;
            const c = centerIndex;
            if (p[c-2] === 0 && p[c-1] === player && p[c] === player && 
                p[c+1] === 0 && p[c+2] === player && p[c+3] === 0) {
                return true;
            }
        }
        
        // 模式2: _X_XX_
        if (checkPattern(0)) {
            const p = pattern;
            const c = centerIndex;
            if (p[c-2] === 0 && p[c-1] === player && p[c] === 0 && 
                p[c+1] === player && p[c+2] === player && p[c+3] === 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 增强威胁检测 - 检测特殊威胁模式
     */
    detectSpecialThreats(pattern, centerIndex, player) {
        const specialThreats = [];
        const values = this.config.threatValues;
        
        // 检测双三模式（专业级以上）
        const doubleThree = this.detectDoubleThree(pattern, centerIndex, player);
        if (doubleThree) {
            const doubleThreeValue = values.DOUBLE_THREE || 20000;
            specialThreats.push({ 
                name: '双三威胁', 
                value: doubleThreeValue, 
                forcing: true 
            });
        }
        
        // 检测连续威胁
        const continueThreat = this.detectContinueThreat(pattern, centerIndex, player);
        if (continueThreat) {
            specialThreats.push({ 
                name: '连续威胁', 
                value: continueThreat.value, 
                forcing: continueThreat.forcing 
            });
        }
        
        return specialThreats;
    }
    
    /**
     * 检测双三模式 - 增强版本
     */
    detectDoubleThree(pattern, centerIndex, player) {
        // 检测可能形成双三的模式
        if (pattern.length < 9) return false;
        
        const p = pattern;
        const c = centerIndex;
        
        // 模式检测：检查是否能同时形成两个活三
        let threeCount = 0;
        const threePositions = [];
        
        // 检查左侧活三可能 _XX_*_ (当前位置为*)
        if (c >= 3 && c < pattern.length - 1) {
            if (p[c-3] === 0 && p[c-2] === player && p[c-1] === player && p[c+1] === 0) {
                threeCount++;
                threePositions.push('left');
            }
        }
        
        // 检查右侧活三可能 _*_XX_ (当前位置为*)
        if (c >= 1 && c <= pattern.length - 4) {
            if (p[c-1] === 0 && p[c+1] === player && p[c+2] === player && p[c+3] === 0) {
                threeCount++;
                threePositions.push('right');
            }
        }
        
        // 检查中心活三可能 _X*X_ (当前位置为*)
        if (c >= 2 && c <= pattern.length - 3) {
            if (p[c-2] === 0 && p[c-1] === player && p[c+1] === player && p[c+2] === 0) {
                threeCount++;
                threePositions.push('center');
            }
        }
        
        // 检查连续活三可能 _XX*_ 或 _*XX_
        if (c >= 2 && c < pattern.length - 2) {
            // _XX*_
            if (p[c-3] === 0 && p[c-2] === player && p[c-1] === player && p[c+1] === 0) {
                threeCount++;
                threePositions.push('continuous-left');
            }
            // _*XX_
            if (p[c-1] === 0 && p[c+1] === player && p[c+2] === player && p[c+3] === 0) {
                threeCount++;
                threePositions.push('continuous-right');
            }
        }
        
        return threeCount >= 2;
    }
    
    /**
     * 检测连续威胁
     */
    detectContinueThreat(pattern, centerIndex, player) {
        // 简单的连续威胁检测
        const { count, leftOpen, rightOpen } = this.countConsecutive(pattern, centerIndex, player);
        
        if (count === 2 && (leftOpen || rightOpen)) {
            // 检查是否能延伸为更强威胁
            if (leftOpen && rightOpen) {
                return { value: 100, forcing: false };
            } else {
                return { value: 50, forcing: false };
            }
        }
        
        return null;
    }
    
    /**
     * 计算连续子数和开放性 - 增强版本
     */
    countConsecutive(pattern, centerIndex, player) {
        let count = 1; // 包含中心位置
        let left = centerIndex - 1;
        let right = centerIndex + 1;
        
        // 向左计算连续子数
        while (left >= 0 && pattern[left] === player) {
            count++;
            left--;
        }
        
        // 向右计算连续子数
        while (right < pattern.length && pattern[right] === player) {
            count++;
            right++;
        }
        
        // 计算开放性（必须是空位且在棋盘范围内）
        const leftOpen = left >= 0 && pattern[left] === 0;
        const rightOpen = right < pattern.length && pattern[right] === 0;
        
        return { count, leftOpen, rightOpen };
    }
    
    /**
     * 获取棋盘哈希（用于置换表）
     */
    getBoardHash() {
        let hash = '';
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                hash += this.board[row][col].toString();
            }
        }
        return hash;
    }
    
    /**
     * 检查游戏是否结束
     */
    isGameEnd() {
        return this.game.checkWin(1) || this.game.checkWin(2) || this.getPieceCount() >= BOARD_SIZE * BOARD_SIZE;
    }
    
    /**
     * 获取棋子总数
     */
    getPieceCount() {
        let count = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] !== 0) count++;
            }
        }
        return count;
    }
    
    /**
     * 计算活跃威胁数量
     */
    countActiveThreat() {
        let count = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0 && this.hasNeighbor(row, col)) {
                    const threat1 = this.analyzeThreatAtPosition(row, col, 1);
                    const threat2 = this.analyzeThreatAtPosition(row, col, 2);
                    if (threat1.forcing || threat2.forcing) count++;
                }
            }
        }
        return count;
    }
    
    /**
     * 检查是否有邻居
     */
    hasNeighbor(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (this.board[r][c] !== 0) return true;
                }
            }
        }
        return false;
    }
    
    /**
     * 计算到中心的距离
     */
    getCenterDistance(row, col) {
        const centerRow = Math.floor(BOARD_SIZE / 2);
        const centerCol = Math.floor(BOARD_SIZE / 2);
        return Math.abs(row - centerRow) + Math.abs(col - centerCol);
    }
    
    /**
     * 评估位置控制
     */
    evaluatePositionalControl(row, col, player) {
        const centerDistance = this.getCenterDistance(row, col);
        return Math.max(1, BOARD_SIZE - centerDistance);
    }
    
    /**
     * 评估连接性
     */
    evaluateConnectivity(row, col, player) {
        let connectValue = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            // 检查这个方向上的连接
            for (let dist = 1; dist <= 2; dist++) {
                const r1 = row + dx * dist;
                const c1 = col + dy * dist;
                const r2 = row - dx * dist;
                const c2 = col - dy * dist;
                
                if (r1 >= 0 && r1 < BOARD_SIZE && c1 >= 0 && c1 < BOARD_SIZE) {
                    if (this.board[r1][c1] === player) connectValue += 3 - dist;
                }
                if (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
                    if (this.board[r2][c2] === player) connectValue += 3 - dist;
                }
            }
        }
        
        return connectValue;
    }
    
    /**
     * 寻找获胜走法 - 修复版本
     */
    findWinningMove(player) {
        const winningMoves = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0) {
                    // 模拟下子
                    this.board[row][col] = player;
                    
                    // 修复：正确调用checkWin方法，传入行列参数
                    const isWin = this.game.checkWin ? 
                        this.game.checkWin(row, col, player) : 
                        this.checkWinDirect(row, col, player);
                    
                    // 恢复棋盘
                    this.board[row][col] = 0;
                    
                    if (isWin) {
                        winningMoves.push({ row, col });
                        // 立即返回第一个找到的获胜走法
                        return { row, col };
                    }
                }
            }
        }
        

        
        return null;
    }
    
    /**
     * 直接检查获胜条件（备用方法）
     */
    checkWinDirect(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (let [dx, dy] of directions) {
            let count = 1; // 包含当前位置
            
            // 向正方向计数
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (newRow >= 0 && newRow < BOARD_SIZE && 
                    newCol >= 0 && newCol < BOARD_SIZE && 
                    this.board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 向负方向计数
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (newRow >= 0 && newRow < BOARD_SIZE && 
                    newCol >= 0 && newCol < BOARD_SIZE && 
                    this.board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= 5) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 获取战略走法（保底选择）
     */
    getStrategicMove() {
        // 优先选择中心附近的位置
        const center = Math.floor(BOARD_SIZE / 2);
        const candidates = [];
        
        for (let dist = 0; dist < 5; dist++) {
            for (let row = Math.max(0, center - dist); row <= Math.min(BOARD_SIZE - 1, center + dist); row++) {
                for (let col = Math.max(0, center - dist); col <= Math.min(BOARD_SIZE - 1, center + dist); col++) {
                    if (this.board[row][col] === 0 && (dist === 0 || this.hasNeighbor(row, col))) {
                        candidates.push({ row, col });
                    }
                }
            }
            if (candidates.length > 0) break;
        }
        
        return candidates.length > 0 ? candidates[0] : { row: center, col: center };
    }


} 