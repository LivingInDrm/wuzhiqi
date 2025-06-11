import { queryDatabase, runDatabase, getOneFromDatabase } from '../database/connection.js';
import { User } from './User.js';

/**
 * 游戏记录模型类
 */
export class GameRecord {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.result = data.result; // 'win', 'lose', 'draw'
        this.difficulty = data.difficulty; // 'simple', 'advanced', 'professional'
        this.moves_count = data.moves_count;
        this.duration_seconds = data.duration_seconds;
        this.ai_level = data.ai_level;
        this.user_color = data.user_color; // 'black', 'white'
        this.final_score = data.final_score;
        this.created_at = data.created_at;
    }

    /**
     * 创建游戏记录
     */
    static async create({
        userId,
        result,
        difficulty,
        moves,
        duration,
        userColor = 'black',
        finalScore = null
    }) {
        try {
            console.log(`🎮 创建游戏记录: 用户${userId}, 结果${result}, 难度${difficulty}`);

            // 验证参数
            if (!['win', 'lose', 'draw'].includes(result)) {
                throw new Error('无效的游戏结果');
            }

            if (!['simple', 'advanced', 'professional'].includes(difficulty)) {
                throw new Error('无效的游戏难度');
            }

            if (!['black', 'white'].includes(userColor)) {
                throw new Error('无效的用户棋子颜色');
            }

            // 插入游戏记录
            const gameRecord = await runDatabase(`
                INSERT INTO game_records (
                    user_id, result, difficulty, moves_count, 
                    duration_seconds, ai_level, user_color, final_score, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                userId,
                result,
                difficulty,
                moves,
                duration,
                difficulty, // ai_level 与 difficulty 相同
                userColor,
                finalScore
            ]);

            // 更新用户统计
            await User.updateGameStats(userId, result, duration);

            console.log(`✅ 游戏记录创建成功: ID ${gameRecord.id}`);

            // 返回创建的记录
            return await GameRecord.findById(gameRecord.id);

        } catch (error) {
            console.error('❌ 创建游戏记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 根据ID查找游戏记录
     */
    static async findById(id) {
        try {
            const record = await getOneFromDatabase(`
                SELECT gr.*, u.username 
                FROM game_records gr
                JOIN users u ON gr.user_id = u.id
                WHERE gr.id = ?
            `, [id]);

            return record ? new GameRecord(record) : null;
        } catch (error) {
            console.error('❌ 查找游戏记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取用户游戏历史
     */
    static async getUserHistory(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                difficulty = null,
                result = null,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE gr.user_id = ?';
            let params = [userId];

            // 添加筛选条件
            if (difficulty) {
                whereClause += ' AND gr.difficulty = ?';
                params.push(difficulty);
            }

            if (result) {
                whereClause += ' AND gr.result = ?';
                params.push(result);
            }

            // 安全的排序字段验证
            const allowedSortFields = ['created_at', 'duration_seconds', 'moves_count', 'result'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const sql = `
                SELECT gr.*, u.username 
                FROM game_records gr
                JOIN users u ON gr.user_id = u.id
                ${whereClause}
                ORDER BY gr.${safeSortBy} ${safeSortOrder}
                LIMIT ? OFFSET ?
            `;

            params.push(limit, offset);
            const records = await queryDatabase(sql, params);

            // 获取总数
            const countSql = `
                SELECT COUNT(*) as total 
                FROM game_records gr 
                ${whereClause}
            `;
            const countResult = await getOneFromDatabase(countSql, params.slice(0, -2));

            console.log(`📊 获取用户${userId}游戏历史: ${records.length}条记录`);

            return {
                records: records.map(record => new GameRecord(record)),
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / limit)
                }
            };

        } catch (error) {
            console.error('❌ 获取用户游戏历史失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取用户游戏统计
     */
    static async getUserStats(userId) {
        try {
            // 基础统计
            const basicStats = await getOneFromDatabase(`
                SELECT 
                    COUNT(*) as total_games,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
                    AVG(duration_seconds) as avg_duration,
                    AVG(moves_count) as avg_moves,
                    MIN(duration_seconds) as fastest_win_duration,
                    MAX(moves_count) as longest_game_moves
                FROM game_records 
                WHERE user_id = ?
            `, [userId]);

            // 按难度统计
            const difficultyStats = await queryDatabase(`
                SELECT 
                    difficulty,
                    COUNT(*) as games_count,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
                    ROUND(AVG(duration_seconds), 2) as avg_duration
                FROM game_records 
                WHERE user_id = ? 
                GROUP BY difficulty
            `, [userId]);

            // 最近游戏趋势（最近10局）
            const recentGames = await queryDatabase(`
                SELECT result, difficulty, duration_seconds, moves_count, created_at
                FROM game_records 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 10
            `, [userId]);

            // 胜率计算
            const winRate = basicStats.total_games > 0 
                ? Math.round((basicStats.wins / basicStats.total_games) * 100 * 100) / 100 
                : 0;

            // 月度统计
            const monthlyStats = await queryDatabase(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as games_count,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins
                FROM game_records 
                WHERE user_id = ? 
                  AND created_at >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
            `, [userId]);

            console.log(`📈 获取用户${userId}详细统计完成`);

            return {
                basic: {
                    ...basicStats,
                    win_rate: winRate,
                    avg_duration: Math.round(basicStats.avg_duration || 0),
                    avg_moves: Math.round(basicStats.avg_moves || 0)
                },
                by_difficulty: difficultyStats.map(stat => ({
                    ...stat,
                    win_rate: stat.games_count > 0 
                        ? Math.round((stat.wins / stat.games_count) * 100 * 100) / 100 
                        : 0
                })),
                recent_games: recentGames,
                monthly_trend: monthlyStats
            };

        } catch (error) {
            console.error('❌ 获取用户统计失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取全局游戏统计
     */
    static async getGlobalStats() {
        try {
            // 全局基础统计
            const globalStats = await getOneFromDatabase(`
                SELECT 
                    COUNT(*) as total_games,
                    COUNT(DISTINCT user_id) as total_players,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as total_wins,
                    SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as total_losses,
                    SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as total_draws,
                    AVG(duration_seconds) as avg_game_duration,
                    AVG(moves_count) as avg_game_moves
                FROM game_records
            `);

            // 按难度的全局统计
            const difficultyStats = await queryDatabase(`
                SELECT 
                    difficulty,
                    COUNT(*) as games_count,
                    AVG(duration_seconds) as avg_duration,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as human_wins,
                    SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as ai_wins
                FROM game_records 
                GROUP BY difficulty
            `);

            // 今日统计
            const todayStats = await getOneFromDatabase(`
                SELECT 
                    COUNT(*) as games_today,
                    COUNT(DISTINCT user_id) as active_players_today
                FROM game_records 
                WHERE date(created_at) = date('now')
            `);

            console.log('🌍 获取全局统计完成');

            return {
                global: {
                    ...globalStats,
                    avg_game_duration: Math.round(globalStats.avg_game_duration || 0),
                    avg_game_moves: Math.round(globalStats.avg_game_moves || 0)
                },
                by_difficulty: difficultyStats.map(stat => ({
                    ...stat,
                    avg_duration: Math.round(stat.avg_duration || 0),
                    human_win_rate: stat.games_count > 0 
                        ? Math.round((stat.human_wins / stat.games_count) * 100 * 100) / 100 
                        : 0
                })),
                today: todayStats
            };

        } catch (error) {
            console.error('❌ 获取全局统计失败:', error.message);
            throw error;
        }
    }

    /**
     * 删除游戏记录（软删除或硬删除）
     */
    static async deleteRecord(id, userId, hardDelete = false) {
        try {
            // 验证记录所有权
            const record = await getOneFromDatabase(
                'SELECT user_id FROM game_records WHERE id = ?',
                [id]
            );

            if (!record || record.user_id !== userId) {
                throw new Error('记录不存在或无权限删除');
            }

            let result;
            if (hardDelete) {
                // 硬删除
                result = await runDatabase(
                    'DELETE FROM game_records WHERE id = ?',
                    [id]
                );
            } else {
                // 软删除（可以添加 deleted_at 字段）
                // 目前直接硬删除
                result = await runDatabase(
                    'DELETE FROM game_records WHERE id = ?',
                    [id]
                );
            }

            console.log(`🗑️ 游戏记录删除成功: ID ${id}`);
            return result.changes > 0;

        } catch (error) {
            console.error('❌ 删除游戏记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 序列化游戏记录信息
     */
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            username: this.username,
            result: this.result,
            difficulty: this.difficulty,
            moves_count: this.moves_count,
            duration_seconds: this.duration_seconds,
            duration_formatted: GameRecord.formatDuration(this.duration_seconds),
            ai_level: this.ai_level,
            user_color: this.user_color,
            final_score: this.final_score,
            created_at: this.created_at
        };
    }

    /**
     * 获取排行榜数据
     */
    static async getLeaderboard({ type = 'win_rate', limit = 20, difficulty = 'all' }) {
        try {
            console.log(`🏆 生成排行榜: ${type}, 限制${limit}, 难度${difficulty}`);

            let difficultyFilter = '';
            let difficultyParams = [];
            
            if (difficulty !== 'all') {
                difficultyFilter = 'AND gr.difficulty = ?';
                difficultyParams = [difficulty];
            }

            // 根据排行榜类型构建不同的查询
            let orderBy, selectFields;
            
            switch (type) {
                case 'win_rate':
                    selectFields = `
                        u.username,
                        COUNT(gr.id) as total_games,
                        SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) as wins,
                        SUM(CASE WHEN gr.result = 'lose' THEN 1 ELSE 0 END) as losses,
                        SUM(CASE WHEN gr.result = 'draw' THEN 1 ELSE 0 END) as draws,
                        ROUND(
                            CASE 
                                WHEN COUNT(gr.id) > 0 
                                THEN (SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0 / COUNT(gr.id))
                                ELSE 0 
                            END, 2
                        ) as win_rate,
                        AVG(gr.duration_seconds) as avg_duration,
                        MIN(CASE WHEN gr.result = 'win' THEN gr.duration_seconds END) as fastest_win,
                        u.created_at as join_date
                    `;
                    orderBy = 'win_rate DESC, total_games DESC, fastest_win ASC';
                    break;
                    
                case 'total_games':
                    selectFields = `
                        u.username,
                        COUNT(gr.id) as total_games,
                        SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) as wins,
                        ROUND(
                            CASE 
                                WHEN COUNT(gr.id) > 0 
                                THEN (SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0 / COUNT(gr.id))
                                ELSE 0 
                            END, 2
                        ) as win_rate,
                        SUM(gr.duration_seconds) as total_time,
                        u.created_at as join_date
                    `;
                    orderBy = 'total_games DESC, win_rate DESC';
                    break;
                    
                case 'fastest_wins':
                    selectFields = `
                        u.username,
                        COUNT(CASE WHEN gr.result = 'win' THEN 1 END) as total_wins,
                        MIN(CASE WHEN gr.result = 'win' THEN gr.duration_seconds END) as fastest_win,
                        MIN(CASE WHEN gr.result = 'win' THEN gr.moves_count END) as fastest_win_moves,
                        COUNT(gr.id) as total_games,
                        ROUND(
                            CASE 
                                WHEN COUNT(gr.id) > 0 
                                THEN (SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0 / COUNT(gr.id))
                                ELSE 0 
                            END, 2
                        ) as win_rate
                    `;
                    orderBy = 'fastest_win ASC, total_wins DESC';
                    break;
                    
                default:
                    throw new Error(`不支持的排行榜类型: ${type}`);
            }

            const sql = `
                SELECT ${selectFields}
                FROM users u
                INNER JOIN game_records gr ON u.id = gr.user_id
                WHERE 1=1 ${difficultyFilter}
                GROUP BY u.id, u.username, u.created_at
                HAVING COUNT(gr.id) >= 1
                ORDER BY ${orderBy}
                LIMIT ?
            `;

            const params = [...difficultyParams, limit];
            const results = await getAllFromDatabase(sql, params);

            // 添加排名和格式化数据
            const leaderboard = results.map((user, index) => ({
                rank: index + 1,
                username: user.username,
                total_games: user.total_games || 0,
                wins: user.wins || 0,
                losses: user.losses || 0,
                draws: user.draws || 0,
                win_rate: user.win_rate || 0,
                avg_duration: user.avg_duration ? Math.round(user.avg_duration) : null,
                avg_duration_formatted: user.avg_duration ? GameRecord.formatDuration(Math.round(user.avg_duration)) : null,
                fastest_win: user.fastest_win || null,
                fastest_win_formatted: user.fastest_win ? GameRecord.formatDuration(user.fastest_win) : null,
                fastest_win_moves: user.fastest_win_moves || null,
                total_time: user.total_time || 0,
                total_time_formatted: user.total_time ? GameRecord.formatDuration(user.total_time) : null,
                join_date: user.join_date,
                // 添加用户级别
                level: this.getUserLevelFromStats(user.total_games, user.win_rate),
                level_name: this.getUserLevelName(this.getUserLevelFromStats(user.total_games, user.win_rate))
            }));

            console.log(`✅ 排行榜生成成功: ${leaderboard.length} 名用户`);
            return leaderboard;

        } catch (error) {
            console.error('❌ 获取排行榜失败:', error.message);
            throw error;
        }
    }

    /**
     * 根据统计计算用户级别
     */
    static getUserLevelFromStats(totalGames, winRate) {
        if (totalGames >= 50 && winRate >= 80) return 5; // 大师
        if (totalGames >= 30 && winRate >= 70) return 4; // 专家
        if (totalGames >= 20 && winRate >= 60) return 3; // 高手
        if (totalGames >= 10 && winRate >= 50) return 2; // 进阶
        return 1; // 新手
    }

    /**
     * 获取用户级别名称
     */
    static getUserLevelName(level) {
        const levelNames = {
            1: '新手',
            2: '进阶',
            3: '高手', 
            4: '专家',
            5: '大师'
        };
        return levelNames[level] || '新手';
    }

    /**
     * 格式化游戏时长
     */
    static formatDuration(seconds) {
        if (!seconds) return '0秒';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}分${remainingSeconds}秒`;
        }
        return `${remainingSeconds}秒`;
    }
}