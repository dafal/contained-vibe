# Contained-Vibe 🖥️

A containerized web-based terminal for running [mistral-vibe](https://github.com/mistralai/mistral-vibe) (Mistral AI's CLI coding assistant) in your browser.

## Features

- 🌐 **Web-based terminal** using xterm.js
- 🐳 **Fully containerized** with Docker
- 🔄 **Real-time PTY streaming** via WebSocket
- 💾 **Persistent configuration** across container restarts
- 🎨 **VS Code-inspired theme** with proper color support
- 🔌 **Auto-reconnection** with exponential backoff
- 📦 **Single container deployment**

## Architecture

```
┌─────────────────┐
│   Browser       │
│   (xterm.js)    │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Node.js Server │
│   (node-pty)    │
└────────┬────────┘
         │ PTY
         ▼
┌─────────────────┐
│  mistral-vibe   │
│   (Python CLI)  │
└─────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Mistral API key ([get one here](https://console.mistral.ai/))

### Installation

1. **Clone or create the project:**
   ```bash
   cd contained-vibe
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your Mistral API key:**
   ```bash
   MISTRAL_API_KEY=your_actual_api_key_here
   ```

4. **Create workspace directory:**
   ```bash
   mkdir -p workspace
   ```

5. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

6. **Open your browser:**
   ```
   http://localhost:3000
   ```

You should see the mistral-vibe terminal interface in your browser!

## Usage

### Basic Commands

Once the terminal loads, you can use vibe just like in a regular terminal:

```bash
# Get help
vibe --help

# Start an interactive session (default)
vibe

# Run a one-off command
vibe --prompt "Explain this codebase"

# Check version
vibe --version
```

### Managing the Container

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Rebuild after code changes
docker-compose up --build

# Clean restart (removes volumes)
docker-compose down -v
docker-compose up --build
```

### Accessing Your Files

The `workspace/` directory in your project is mounted to `/workspace` inside the container. Put your code here:

```bash
# On your host machine
cd workspace
git clone https://github.com/your/project.git

# In the browser terminal, it will be available at:
cd /workspace/project
vibe
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MISTRAL_API_KEY` | Yes | - | Your Mistral AI API key |
| `PORT` | No | 3000 | Server port |
| `WORKSPACE_DIR` | No | /workspace | Working directory for vibe |

### Volumes

The docker-compose configuration creates two volumes:

1. **`./workspace:/workspace`** - Bind mount for your project files
2. **`vibe-config:/root/.vibe`** - Named volume for vibe configuration (API keys, history, settings)

The vibe config volume persists across container restarts, so you won't need to reconfigure vibe each time.

## Development

### Project Structure

```
contained-vibe/
├── server/              # Node.js backend
│   ├── src/
│   │   ├── index.ts        # WebSocket server + static file serving
│   │   ├── pty-manager.ts  # PTY lifecycle management
│   │   └── types.ts        # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── client/              # Frontend
│   ├── src/
│   │   ├── main.ts         # Application entry point
│   │   ├── terminal.ts     # xterm.js terminal manager
│   │   ├── websocket.ts    # WebSocket client with reconnection
│   │   └── styles.css      # Terminal styling
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker/
│   └── Dockerfile          # Multi-stage build
├── docker-compose.yml
├── .env.example
└── README.md
```

### Local Development

#### Backend (Server)

```bash
cd server
npm install
npm run build
npm start
```

#### Frontend (Client)

```bash
cd client
npm install
npm run dev     # Starts Vite dev server on port 5173
```

For local development, the frontend (port 5173) will proxy WebSocket connections to the backend (port 3000).

### Technology Stack

- **Frontend**: TypeScript, xterm.js, Vite
- **Backend**: Node.js, TypeScript, node-pty, ws (WebSocket)
- **Container**: Docker (Debian-based for node-pty compatibility)
- **Terminal App**: mistral-vibe (Python)

## Troubleshooting

### "Connection refused" or WebSocket errors

- Ensure the container is running: `docker-compose ps`
- Check logs: `docker-compose logs`
- Verify port 3000 is not in use: `lsof -i :3000`

### "MISTRAL_API_KEY not set"

- Ensure `.env` file exists and contains your API key
- Restart the container after updating `.env`

### Terminal appears but vibe doesn't start

- Check if vibe is installed: `docker-compose exec contained-vibe vibe --version`
- View container logs: `docker-compose logs -f`

### Resize issues

- Try refreshing the browser
- Check browser console for errors (F12 → Console)

### Vibe config not persisting

- Ensure the named volume exists: `docker volume ls | grep vibe-config`
- Don't use `docker-compose down -v` (this removes volumes)

## Security Notes

This setup is designed for **local development only**:

- No authentication or authorization
- Binds to all interfaces (0.0.0.0)
- No TLS/HTTPS support

**For production deployment**, consider adding:
- Reverse proxy with TLS (nginx, Caddy)
- Token-based authentication
- Rate limiting
- Network isolation

## License

MIT

## Credits

- [mistral-vibe](https://github.com/mistralai/mistral-vibe) - Mistral AI's CLI coding assistant
- [xterm.js](https://xtermjs.org/) - Terminal emulator for the web
- [node-pty](https://github.com/microsoft/node-pty) - PTY bindings for Node.js

---

**Enjoy coding with Contained-Vibe! 🚀**
