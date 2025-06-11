# 五子棋AI游戏 (Gomoku AI Game)

一个基于JavaScript的五子棋游戏，具有智能AI对手和多种难度级别。

## ✨ 特性

- 🎯 **三种AI难度**：入门、进阶、专业
- 🎲 **随机先手**：每局随机决定黑白方
- 🎨 **精美界面**：Canvas绘制，响应式设计
- ↩️ **悔棋功能**：支持撤销操作
- 🧠 **智能AI**：Minimax算法 + Alpha-Beta剪枝
- 📱 **跨平台**：支持桌面和移动设备

## 🚀 快速开始

### 本地运行

1. 克隆项目
```bash
git clone <repository-url>
cd wuziqi
```

2. 启动本地服务器
```bash
# 使用Python
python3 -m http.server 8080

# 或使用Node.js
npx http-server -p 8080
```

3. 在浏览器中访问
```
http://localhost:8080
```

### 在线部署

项目为纯前端应用，可直接部署到：
- GitHub Pages
- Vercel
- Netlify
- 任何静态文件托管服务

## 🎮 游戏规则

- 玩家与AI轮流下子
- 首先连成五子者获胜
- 支持横、竖、斜四个方向
- 黑子先手，随机分配先手方

## 🤖 AI技术

### 算法特性
- **威胁识别**：识别活四、冲四、活三等模式
- **多步预判**：Minimax搜索树 + Alpha-Beta剪枝
- **动态评估**：位置价值、威胁价值、连接性评估
- **难度分级**：不同深度和策略配置

### 三种难度
- **入门级**：适合新手练习，搜索深度3层
- **进阶级**：平衡攻防，搜索深度6层
- **专业级**：强攻击性，搜索深度10层

## 📁 项目结构

```
wuziqi/
├── index.html          # 主页面
├── style.css           # 样式文件
├── main.js             # 主程序入口
├── src/
│   ├── game.js         # 游戏逻辑
│   ├── ai.js           # AI接口
│   ├── advanced-ai.js  # 高级AI算法
│   ├── config.js       # 配置文件
│   └── renderer.js     # 渲染器
├── arch_overview.md    # 架构文档
└── README.md           # 项目说明
```

## 🛠️ 技术栈

- **前端**：原生JavaScript (ES6+)
- **渲染**：HTML5 Canvas
- **样式**：CSS3 + Flexbox/Grid
- **算法**：Minimax + Alpha-Beta剪枝
- **架构**：模块化设计

## 📈 开发计划

- [ ] 优化AI攻防平衡
- [ ] 添加用户对战功能
- [ ] 实现游戏回放
- [ ] 添加音效和动画
- [ ] 支持自定义棋盘大小

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📞 联系

如有问题或建议，请提交Issue。 