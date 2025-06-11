# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Gomoku (五子棋) AI game built with vanilla JavaScript and Node.js. The project consists of:
- **Frontend**: A browser-based game with intelligent AI opponents
- **Backend**: Express.js server with user authentication and leaderboard system

## Development Commands

### Frontend Development
```bash
cd frontend
./start-server.sh
# Or manually: python3 -m http.server 8080
# Access at http://localhost:8080
```

### Backend Development  
```bash
cd backend
npm install
npm run dev  # Development mode with auto-restart
npm start    # Production mode
# Backend runs at http://localhost:3000
```

### Testing
- Use browser developer tools for frontend debugging
- Backend has no automated tests currently
- AI testing available at `frontend/test-threat-fixes.html`

## Architecture

### Frontend Structure
- **Entry**: `main.js` initializes the game
- **Core Game Logic**: `src/game.js` - manages game state, moves, win detection
- **AI System**: 
  - `src/ai.js` - AI difficulty router and instance manager
  - `src/advanced-ai.js` - sophisticated AI engine with threat analysis and minimax search
- **Rendering**: `src/renderer.js` - Canvas-based game board rendering
- **Configuration**: `src/config.js` - game constants and difficulty settings

### Backend Structure
- **Server**: `server.js` - Express.js main server
- **Database**: SQLite database in `database/` folder
- **Models**: `models/User.js`, `models/GameRecord.js`
- **Routes**: `routes/auth.js`, `routes/games.js`
- **Middleware**: Authentication and validation in `middleware/`

### Key Design Patterns
- **Zero Dependencies Frontend**: Uses only vanilla JavaScript, no external libraries
- **Modular AI**: Three-tier difficulty system (简单/进阶/专业) with separate AI instances
- **Canvas Rendering**: Custom renderer for smooth game graphics
- **RESTful API**: Backend follows REST conventions for game data

### AI Implementation
The AI uses a sophisticated 9-layer decision system:
1. Check for winning moves
2. Block opponent wins
3. Urgent threat defense
4. Combined threat attacks
5. Combined threat defense
6. Strategic threat setup
7. Minimax search with alpha-beta pruning

### Data Flow
- User input → `game.js` → `ai.js` → `advanced-ai.js` → move calculation
- Game state updates trigger `renderer.js` for visual updates
- Backend stores game results and user statistics

## Common Tasks

### Adding New AI Difficulty
1. Edit `src/config.js` to add new difficulty level
2. Update difficulty configuration in `src/advanced-ai.js`
3. Modify `src/ai.js` to handle the new difficulty routing

### Modifying Game Rules
- Board size: Change `BOARD_SIZE` in `src/config.js`
- Win condition: Modify `checkWin()` in `src/game.js`
- Rendering: Update canvas dimensions in `src/config.js`

### Database Changes
- Models are in `backend/models/`
- Database connection in `backend/database/connection.js`
- SQLite database file at `backend/database/game.db`

## Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3
- **Backend**: Node.js, Express.js, SQLite, JWT authentication
- **No build system**: Direct file serving, no bundling required
- **No testing framework**: Manual testing via browser and test HTML files