import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Dùng JS ES6 trực tiếp từ client được chia sẻ
import { SeedManager } from '../public/js/core/prng.js';
import { GraphGenerator } from '../public/js/core/graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const rooms = {};

// Validator Helper
function validatePath(seedStr, pathStack) {
    const configData = SeedManager.decode(seedStr);
    const graphGen = new GraphGenerator(configData.nodeCount, configData.complexity, configData.rawNumericSeed);
    let adjacencyList = graphGen.generate();
    
    // Server tái hiện logic sửa lỗi "Tia Laze" khi đồ thị Không-Euler
    let oddDegreeCount = 0;
    for (const [node, neighbors] of adjacencyList.entries()) {
        if (neighbors.length % 2 !== 0) oddDegreeCount++;
    }
    
    if (oddDegreeCount > 2) {
        let odds = [];
        for (const [node, neighbors] of adjacencyList.entries()) {
            if (neighbors.length % 2 !== 0) odds.push(node);
        }
        while (odds.length > 2) {
            let u = odds.pop();
            let paired = false;
            for (let i = 0; i < odds.length; i++) {
                let v = odds[i];
                if (!graphGen.adjacencyList.get(u).includes(v)) {
                    graphGen.addEdge(u, v);
                    odds.splice(i, 1);
                    paired = true;
                    break;
                }
            }
            if (!paired && odds.length > 0) {
                let v = odds.pop();
                graphGen._removeEdge(u, v);
            }
        }
        adjacencyList = graphGen.adjacencyList;
    }

    // Đếm tổng số cạnh cần đi qua
    let totalEdges = 0;
    for (const [node, neighbors] of adjacencyList.entries()) totalEdges += neighbors.length;
    totalEdges /= 2;

    if (pathStack.length - 1 !== totalEdges) {
        return { valid: false, reason: "Đường đi không đủ để che phủ toàn bộ map." };
    }

    let visitedEdges = new Set();
    const getEdgeKey = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

    // Duyệt qua path do Client gửi, kiểm tra hợp lệ
    for (let i = 0; i < pathStack.length - 1; i++) {
        let u = pathStack[i];
        let v = pathStack[i+1];
        
        let neighbors = adjacencyList.get(u);
        if (!neighbors || !neighbors.includes(v)) {
            return { valid: false, reason: `Không tồn tại cạnh nối giữa ${u} và ${v}. Gian lận cạnh!` };
        }
        
        let edgeKey = getEdgeKey(u, v);
        if (visitedEdges.has(edgeKey)) {
             return { valid: false, reason: `Cạnh ${u}-${v} đã được đi qua. Gian lận đường!` };
        }
        visitedEdges.add(edgeKey);
    }

    return { valid: true, reason: "Hợp lệ tuyệt đối." };
}

// Lưu Database kiểu đơn giản vào JSON
function saveReplay(roomId, playerId, seedStr, timeTaken, pathStack) {
    const replayFile = path.join(__dirname, 'replays.json');
    let replays = [];
    if (fs.existsSync(replayFile)) {
        replays = JSON.parse(fs.readFileSync(replayFile, 'utf8'));
    }
    
    // Lưu lượng cực nhẹ (chỉ mảng Array nguyên thủy pathStack và seedStr 5 ký tự)
    replays.push({
        id: Date.now().toString(36),
        timestamp: new Date().toISOString(),
        playerId,
        roomId,
        seedStr,
        timeTaken,
        pathData: pathStack.join('-')
    });

    fs.writeFileSync(replayFile, JSON.stringify(replays, null, 2));
}

io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`);

    socket.on('CREATE_ROOM', () => {
        let code;
        do {
            code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (rooms[code]);
        socket.emit('ROOM_CREATED', code);
    });

    socket.on('JOIN_ROOM', (roomId) => {
        socket.join(roomId);
        console.log(`[Rooms] Socket ${socket.id} joined room: ${roomId}`);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: new Set(),
                gameStarted: false,
                seedStr: null,
                startTime: 0
            };
        }
        rooms[roomId].players.add(socket.id);
        io.to(roomId).emit('ROOM_UPDATE', { playerCount: rooms[roomId].players.size });
    });

    socket.on('START_GAME', (data) => {
        const { roomId, nodeCount, complexity, levelId } = data;
        
        // Sử dụng hàm SeedManager chung
        const seedStr = SeedManager.encode(nodeCount, complexity, levelId);
        const timestamp = Date.now();

        if (rooms[roomId]) {
            rooms[roomId].gameStarted = true;
            rooms[roomId].seedStr = seedStr;
            rooms[roomId].startTime = timestamp;
        }

        io.to(roomId).emit('GAME_STARTED', { seedStr: seedStr, startTimestamp: timestamp });
    });

    socket.on('SUBMIT_RESULT', (data) => {
        const { roomId, pathStack, timeTaken } = data;
        const seedStr = rooms[roomId]?.seedStr;
        
        if (!seedStr) return;

        // BƯỚC 4: SERVER VALIDATION
        const check = validatePath(seedStr, pathStack);
        
        if (check.valid) {
            console.log(`[Valid OK] Player ${socket.id} solved valid graph in ${timeTaken}ms!`);
            
            // Replay Saving lưu trữ Data Base
            saveReplay(roomId, socket.id, seedStr, timeTaken, pathStack);

            // Gửi thông báo vinh danh và xử thua các máy khác
            socket.to(roomId).emit('OPPONENT_FINISHED', {
                playerId: socket.id,
                timeTaken: timeTaken
            });
        } else {
            console.warn(`[Cheat Detected] Player ${socket.id} submitted invalid path: ${check.reason}`);
            // Gửi Reject về thẳng cái Client gian lận đó
            socket.emit('VALIDATION_REJECTED', {
                reason: check.reason
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
        for (const [roomId, roomData] of Object.entries(rooms)) {
            if (roomData.players.has(socket.id)) {
                roomData.players.delete(socket.id);
                io.to(roomId).emit('ROOM_UPDATE', { playerCount: roomData.players.size });
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
