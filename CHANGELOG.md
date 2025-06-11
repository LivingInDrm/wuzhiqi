# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-11

### Added
- 🎮 **完整的五子棋游戏系统**
  - 15×15标准棋盘，五子连珠获胜
  - 人机对战模式，支持用户vs AI
  - 实时交互界面，鼠标点击和触摸操作
  
- 🧠 **智能AI系统**
  - 三种难度级别：简单、进阶、专业
  - 高级威胁识别算法（活四、冲四、活三、跳三等）
  - Minimax搜索算法 + Alpha-Beta剪枝优化
  - 动态策略调整和性能优化
  
- 🎯 **游戏特性**
  - 随机先手系统：每局随机决定用户或AI执黑先手
  - 悔棋功能：支持撤销双方上一轮操作
  - 难度切换：游戏中可实时调整AI难度
  - 胜负判定：支持横、竖、斜四个方向连珠检测
  
- 🎨 **用户界面**
  - 基于HTML5 Canvas的精美棋盘渲染
  - 实时预览功能：鼠标悬停显示落子预览
  - 获胜连线高亮显示
  - 响应式设计，支持桌面和移动设备
  
- ⚙️ **技术架构**
  - 纯原生JavaScript实现，零外部依赖
  - 模块化设计，职责清晰分离
  - ES6+ 语法和模块系统
  - 完整的错误处理和日志系统

### Technical Details
- **核心算法**: 九层AI决策系统，包含获胜检测、紧急防守、多重威胁分析等
- **性能优化**: 置换表缓存、移动排序、动态搜索深度
- **代码质量**: 完整的架构文档和技术说明
- **部署支持**: 静态文件部署，支持所有主流托管平台

### Files Structure
```
wuziqi/
├── index.html          # 主页面
├── style.css           # 样式文件  
├── main.js             # 应用入口
├── src/
│   ├── game.js         # 游戏主逻辑
│   ├── ai.js           # AI分发器
│   ├── advanced-ai.js  # 高级AI算法
│   ├── config.js       # 全局配置
│   └── renderer.js     # 渲染引擎
├── README.md           # 项目说明
└── arch_overview.md    # 架构文档
```

---

## [Unreleased]

### Planned Features
- [ ] 用户对战功能
- [ ] 游戏回放系统
- [ ] 音效和动画优化
- [ ] 自定义棋盘大小
- [ ] 游戏统计和排行榜
- [ ] 多语言支持