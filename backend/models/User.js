import bcrypt from 'bcryptjs';
import { queryDatabase, runDatabase, getOneFromDatabase } from '../database/connection.js';

/**
 * 用户模型类
 */
export class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.created_at = data.created_at;
        this.last_login = data.last_login;
        this.games_played = data.games_played || 0;
        this.games_won = data.games_won || 0;
        this.games_lost = data.games_lost || 0;
        this.games_draw = data.games_draw || 0;
        this.rating = data.rating || 1000;
        this.total_playtime = data.total_playtime || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
    }

    /**
     * 创建新用户
     */
    static async create({ username, email, password }) {
        try {
            console.log(`👤 开始创建用户: ${username}`);
            
            // 检查用户名是否已存在
            const existingUserByUsername = await getOneFromDatabase(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
            
            if (existingUserByUsername) {
                throw new Error('用户名已存在');
            }

            // 检查邮箱是否已存在
            const existingUserByEmail = await getOneFromDatabase(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            
            if (existingUserByEmail) {
                throw new Error('邮箱已被注册');
            }

            // 加密密码
            const saltRounds = 12;
            const password_hash = await bcrypt.hash(password, saltRounds);

            // 插入新用户
            const result = await runDatabase(`
                INSERT INTO users (username, email, password_hash, created_at) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [username, email, password_hash]);

            console.log(`✅ 用户创建成功: ${username} (ID: ${result.id})`);
            
            // 返回新创建的用户信息（不包含密码）
            return await User.findById(result.id);

        } catch (error) {
            console.error('❌ 用户创建失败:', error.message);
            throw error;
        }
    }

    /**
     * 用户登录验证
     */
    static async authenticate(username, password) {
        try {
            console.log(`🔐 用户登录验证: ${username}`);
            
            // 查找用户（支持用户名或邮箱登录）
            const user = await getOneFromDatabase(`
                SELECT id, username, email, password_hash, is_active, last_login
                FROM users 
                WHERE (username = ? OR email = ?) AND is_active = 1
            `, [username, username]);

            if (!user) {
                throw new Error('用户名或密码错误');
            }

            // 验证密码
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            
            if (!isPasswordValid) {
                console.log(`❌ 密码验证失败: ${username}`);
                throw new Error('用户名或密码错误');
            }

            // 更新最后登录时间
            await runDatabase(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            console.log(`✅ 用户登录成功: ${user.username} (ID: ${user.id})`);
            
            // 返回用户信息（不包含密码）
            const { password_hash, ...userWithoutPassword } = user;
            return new User(userWithoutPassword);

        } catch (error) {
            console.error('❌ 用户认证失败:', error.message);
            throw error;
        }
    }

    /**
     * 根据ID查找用户
     */
    static async findById(id) {
        try {
            const user = await getOneFromDatabase(`
                SELECT id, username, email, created_at, last_login, 
                       games_played, games_won, games_lost, games_draw, 
                       rating, total_playtime, is_active
                FROM users 
                WHERE id = ? AND is_active = 1
            `, [id]);

            return user ? new User(user) : null;
        } catch (error) {
            console.error('❌ 查找用户失败:', error.message);
            throw error;
        }
    }

    /**
     * 根据用户名查找用户
     */
    static async findByUsername(username) {
        try {
            const user = await getOneFromDatabase(`
                SELECT id, username, email, created_at, last_login, 
                       games_played, games_won, games_lost, games_draw, 
                       rating, total_playtime, is_active
                FROM users 
                WHERE username = ? AND is_active = 1
            `, [username]);

            return user ? new User(user) : null;
        } catch (error) {
            console.error('❌ 查找用户失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取用户统计信息
     */
    async getStats() {
        try {
            const stats = await getOneFromDatabase(`
                SELECT * FROM user_stats WHERE id = ?
            `, [this.id]);

            return stats || {
                games_played: 0,
                games_won: 0,
                games_lost: 0,
                games_draw: 0,
                win_rate: 0,
                rating: 1000,
                total_playtime: 0
            };
        } catch (error) {
            console.error('❌ 获取用户统计失败:', error.message);
            throw error;
        }
    }

    /**
     * 更新用户游戏统计
     */
    static async updateGameStats(userId, result, duration) {
        try {
            let updateSql;
            const params = [duration, userId];

            switch (result) {
                case 'win':
                    updateSql = `
                        UPDATE users 
                        SET games_played = games_played + 1, 
                            games_won = games_won + 1,
                            total_playtime = total_playtime + ?,
                            rating = rating + 20
                        WHERE id = ?
                    `;
                    break;
                case 'lose':
                    updateSql = `
                        UPDATE users 
                        SET games_played = games_played + 1, 
                            games_lost = games_lost + 1,
                            total_playtime = total_playtime + ?,
                            rating = CASE 
                                WHEN rating > 1000 THEN rating - 15 
                                ELSE rating 
                            END
                        WHERE id = ?
                    `;
                    break;
                case 'draw':
                    updateSql = `
                        UPDATE users 
                        SET games_played = games_played + 1, 
                            games_draw = games_draw + 1,
                            total_playtime = total_playtime + ?,
                            rating = rating + 5
                        WHERE id = ?
                    `;
                    break;
                default:
                    throw new Error('无效的游戏结果');
            }

            const result_update = await runDatabase(updateSql, params);
            console.log(`📊 用户统计更新成功: 用户${userId}, 结果${result}, 时长${duration}秒`);
            
            return result_update.changes > 0;
        } catch (error) {
            console.error('❌ 更新用户统计失败:', error.message);
            throw error;
        }
    }

    /**
     * 更改密码
     */
    async changePassword(oldPassword, newPassword) {
        try {
            // 验证旧密码
            const userWithPassword = await getOneFromDatabase(
                'SELECT password_hash FROM users WHERE id = ?',
                [this.id]
            );

            if (!userWithPassword) {
                throw new Error('用户不存在');
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, userWithPassword.password_hash);
            if (!isOldPasswordValid) {
                throw new Error('原密码错误');
            }

            // 加密新密码
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // 更新密码
            await runDatabase(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, this.id]
            );

            console.log(`🔐 用户密码更新成功: ${this.username}`);
            return true;

        } catch (error) {
            console.error('❌ 密码更新失败:', error.message);
            throw error;
        }
    }

    /**
     * 停用用户账户
     */
    async deactivate() {
        try {
            await runDatabase(
                'UPDATE users SET is_active = 0 WHERE id = ?',
                [this.id]
            );
            
            this.is_active = false;
            console.log(`🚫 用户账户已停用: ${this.username}`);
            return true;
        } catch (error) {
            console.error('❌ 停用用户失败:', error.message);
            throw error;
        }
    }

    /**
     * 序列化用户信息（用于API响应）
     */
    toJSON() {
        const { password_hash, ...userInfo } = this;
        return {
            ...userInfo,
            // 添加计算字段
            win_rate: this.games_played > 0 
                ? Math.round((this.games_won / this.games_played) * 100 * 100) / 100 
                : 0
        };
    }
}