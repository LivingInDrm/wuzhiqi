import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const DB_PATH = process.env.DB_PATH || join(__dirname, 'game.db');
const NODE_ENV = process.env.NODE_ENV || 'development';

// 启用详细模式（开发环境）
if (NODE_ENV === 'development') {
    sqlite3.verbose();
}

// 数据库连接单例
let db = null;

/**
 * 获取数据库连接
 */
export function getDatabase() {
    if (!db) {
        console.log('🗄️  初始化数据库连接:', DB_PATH);
        
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ 数据库连接失败:', err.message);
                throw err;
            }
            console.log('✅ 数据库连接成功');
        });

        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
        
        // 设置WAL模式（更好的并发性能）
        db.run('PRAGMA journal_mode = WAL');
        
        // 初始化数据库表
        initializeTables();
    }
    
    return db;
}

/**
 * 初始化数据库表
 */
function initializeTables() {
    console.log('📋 检查并创建数据库表...');
    
    // 用户表
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            games_played INTEGER DEFAULT 0,
            games_won INTEGER DEFAULT 0,
            games_lost INTEGER DEFAULT 0,
            games_draw INTEGER DEFAULT 0,
            rating INTEGER DEFAULT 1000,
            total_playtime INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1
        )
    `;

    // 游戏记录表
    const createGameRecordsTable = `
        CREATE TABLE IF NOT EXISTS game_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'lose', 'draw')),
            difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('simple', 'advanced', 'professional')),
            moves_count INTEGER NOT NULL,
            duration_seconds INTEGER NOT NULL,
            ai_level VARCHAR(20) NOT NULL,
            user_color VARCHAR(10) NOT NULL CHECK (user_color IN ('black', 'white')),
            final_score VARCHAR(20),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    // 用户统计视图
    const createUserStatsView = `
        CREATE VIEW IF NOT EXISTS user_stats AS
        SELECT 
            u.id,
            u.username,
            u.games_played,
            u.games_won,
            u.games_lost,
            u.games_draw,
            u.rating,
            u.total_playtime,
            CASE 
                WHEN u.games_played > 0 THEN ROUND(u.games_won * 100.0 / u.games_played, 2)
                ELSE 0
            END as win_rate,
            u.created_at,
            u.last_login
        FROM users u
        WHERE u.is_active = 1
    `;

    // 排行榜视图
    const createRankingsView = `
        CREATE VIEW IF NOT EXISTS rankings AS 
        SELECT 
            u.username,
            u.games_played,
            u.games_won,
            u.games_lost,
            u.games_draw,
            u.rating,
            u.total_playtime,
            CASE 
                WHEN u.games_played > 0 THEN ROUND(u.games_won * 100.0 / u.games_played, 2)
                ELSE 0
            END as win_rate,
            ROW_NUMBER() OVER (ORDER BY u.rating DESC, u.games_won DESC) as rank_by_rating,
            ROW_NUMBER() OVER (ORDER BY CASE WHEN u.games_played > 0 THEN u.games_won * 100.0 / u.games_played ELSE 0 END DESC, u.games_won DESC) as rank_by_winrate
        FROM users u 
        WHERE u.games_played >= 5 AND u.is_active = 1
        ORDER BY u.rating DESC, u.games_won DESC
    `;

    // 创建索引
    const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC)',
        'CREATE INDEX IF NOT EXISTS idx_game_records_user_id ON game_records(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_game_records_difficulty ON game_records(difficulty)',
        'CREATE INDEX IF NOT EXISTS idx_game_records_result ON game_records(result)',
        'CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at DESC)'
    ];

    // 执行创建表的SQL
    const statements = [
        createUsersTable,
        createGameRecordsTable,
        createUserStatsView,
        createRankingsView,
        ...createIndexes
    ];

    db.serialize(() => {
        statements.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ 执行SQL语句失败 (${index + 1}):`, err.message);
                } else {
                    console.log(`✅ SQL语句执行成功 (${index + 1}/${statements.length})`);
                }
            });
        });
        
        console.log('🎉 数据库表初始化完成!');
    });
}

/**
 * 执行查询（Promise封装）
 */
export function queryDatabase(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('🔍 查询失败:', err.message, '| SQL:', sql);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * 执行单条查询
 */
export function getOneFromDatabase(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('🔍 单条查询失败:', err.message, '| SQL:', sql);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * 执行修改操作（INSERT, UPDATE, DELETE）
 */
export function runDatabase(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.run(sql, params, function(err) {
            if (err) {
                console.error('✏️ 修改操作失败:', err.message, '| SQL:', sql);
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
    if (db) {
        console.log('🔒 关闭数据库连接...');
        db.close((err) => {
            if (err) {
                console.error('❌ 关闭数据库失败:', err.message);
            } else {
                console.log('✅ 数据库连接已关闭');
                db = null;
            }
        });
    }
}

// 进程退出时关闭数据库连接
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);
process.on('exit', closeDatabase);