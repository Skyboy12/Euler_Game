import { mulberry32, SeedManager } from './core/prng.js';
import { GraphGenerator } from './core/graph.js';

// Override global alert to show in document instead of browser popup
window.alert = function(msg) {
    let container = document.getElementById('custom-alert-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'custom-alert-container';
        document.body.appendChild(container);
    }
    
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert-box';
    alertBox.innerText = msg;
    container.appendChild(alertBox);
    
    // Animate in
    requestAnimationFrame(() => {
        // Need a tiny delay for transition to trigger properly after append
        setTimeout(() => {
            alertBox.style.opacity = '1';
            alertBox.style.transform = 'translateY(0)';
        }, 10);
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (alertBox.parentElement) {
                alertBox.parentElement.removeChild(alertBox);
            }
        }, 300);
    }, 5000);
};

// --- Game Configuration ---
const LEVEL_ID = 1;
const COMPLEXITY = 5;

function getRandomNodeCount() {
    return Math.floor(Math.random() * 8) + 7; // Từ 7 đến 14 đỉnh
} 

// --- Game State ---
let graphArea = { width: 800, height: 600, padding: 50 };
let nodes = [];
let adjacencyList = new Map();
let canvas, ctx;

// Player Interaction State
let visitedEdges = new Set();
let pathStack = []; // Lưu ID của các đỉnh đi qua: [0, 2, 5...]
let isDragging = false;
let mousePos = null;

// Game Phases
const PHASE_ANALYSIS = 0;
const PHASE_DRAWING = 1;
const PHASE_FIXING = 2; // Giai đoạn tự nối đỉnh
let currentPhase = PHASE_ANALYSIS;

// Sidebar UI State
let isMatrixView = false;

// Fix State (Tự gắn đỉnh)
let selectedFixNode = null;
let originalAdjacencyList = null; // Dùng để undo lúc chết 3 lần
let failCount = 0;
let maxFixConnections = 0;
let currentFixConnections = 0;

// Graph Instance
let currentGraphGen = null;
let animationTimeout = null;

// Multiplayer & Sync State
let socket = null;
let currentRoomId = null;
let gameStartTime = 0;
let timerInterval = null;

function getEdgeKey(u, v) {
    if (currentGraphGen && currentGraphGen.isHardMode) {
        return `${u}-${v}`;
    }
    // Luôn sắp xếp u, v từ bé đến lớn để có key duy nhất cho vô hướng
    return u < v ? `${u}-${v}` : `${v}-${u}`;
}

function updateTimer() {
    if(!gameStartTime) return;
    const now = Date.now();
    const diff = Math.floor((now - gameStartTime) / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
}

function connectMultiplayer() {
    // Chỉ init nếu html load được io variable
    if(typeof io !== 'undefined') {
        socket = io();
        
        socket.on('ROOM_UPDATE', (data) => {
            document.getElementById('room-status').innerText = `Players: ${data.players.length}`;
            
            const playerListDiv = document.getElementById('player-list');
            playerListDiv.innerHTML = '';
            
            const isMeHost = socket.id === data.hostId;
            document.getElementById('btn-start-mp').style.display = (isMeHost && data.players.length >= 1) ? 'inline-block' : 'none';

            data.players.forEach(p => {
                const li = document.createElement('li');
                li.className = 'player-item';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name' + (p.id === data.hostId ? ' host' : '');
                nameSpan.innerText = p.nickname + (p.id === socket.id ? ' (Bạn)' : '') + (p.id === data.hostId ? ' 👑' : '');
                li.appendChild(nameSpan);
                
                if (isMeHost && p.id !== socket.id) {
                    const kickBtn = document.createElement('button');
                    kickBtn.className = 'kick-btn';
                    kickBtn.innerText = 'Kick';
                    kickBtn.onclick = () => {
                        socket.emit('KICK_PLAYER', { roomId: currentRoomId, targetId: p.id });
                    };
                    li.appendChild(kickBtn);
                }
                
                playerListDiv.appendChild(li);
            });
        });

        socket.on('ROOM_CREATED', (code) => {
            document.getElementById('room-input').value = code;
            currentRoomId = code;
            const nickname = document.getElementById('nickname-input').value.trim();
            socket.emit('JOIN_ROOM', { roomId: code, nickname });
            document.getElementById('room-status').innerText = 'Đang chờ...';
        });

        socket.on('GAME_STARTED', (data) => {
            console.log("Game started globally with seed:", data.seedStr);
            gameStartTime = data.startTimestamp;
            
            // Xóa đồng hồ cũ
            if(timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimer, 1000);

            // Bắt đầu generate game từ seed server đưa
            generateGame(data.seedStr);
        });

        socket.on('JOIN_ERROR', (msg) => {
            alert(msg);
            document.getElementById('room-status').innerText = 'Lỗi: ' + msg;
            currentRoomId = null; // Clear room id
            document.getElementById('player-list').innerHTML = '';
        });

        socket.on('KICKED', () => {
            alert("Bạn đã bị Chủ phòng đuổi khỏi phòng!");
            currentRoomId = null;
            document.getElementById('room-status').innerText = "Đã bị đuổi";
            document.getElementById('player-list').innerHTML = '';
            document.getElementById('btn-start-mp').style.display = 'none';
        });
        
        socket.on('OPPONENT_FINISHED', (data) => {
            alert(`Đối thủ đã hoàn thành xong trong ${data.timeTaken}ms! Bạn đã thua.`);
            if(timerInterval) clearInterval(timerInterval);
        });
        
        socket.on('VALIDATION_REJECTED', (data) => {
            alert(`Hệ thống báo cáo Gian lận từ bạn: ${data.reason}\n\nKết quả không được chấp nhận!`);
        });
    }

    document.getElementById('btn-create-room').onclick = () => {
        const nickname = document.getElementById('nickname-input').value.trim();
        if (!nickname) {
            alert('Vui lòng nhập Tên của bạn!');
            return;
        }
        if(socket) {
            socket.emit('CREATE_ROOM', { nickname });
            document.getElementById('room-status').innerText = 'Đang tạo phòng...';
        }
    };

    document.getElementById('btn-join').onclick = () => {
        const nickname = document.getElementById('nickname-input').value.trim();
        if (!nickname) {
            alert('Vui lòng nhập Tên của bạn!');
            return;
        }
        const roomId = document.getElementById('room-input').value.trim();
        if(roomId && socket) {
            currentRoomId = roomId;
            socket.emit('JOIN_ROOM', { roomId, nickname });
            document.getElementById('room-status').innerText = 'Đang chờ...';
        }
    };

    document.getElementById('btn-start-mp').onclick = () => {
        if(socket && currentRoomId) {
            const isHard = document.getElementById('chk-hard-mode').checked;
            socket.emit('START_GAME', {
                roomId: currentRoomId,
                nodeCount: getRandomNodeCount(),
                complexity: COMPLEXITY,
                levelId: LEVEL_ID,
                isHardMode: isHard // Đồng bộ host game config
            });
        }
    };
}

function generateGame(encodedSeedStr) {
    document.getElementById('seed-display').innerText = encodedSeedStr;

    // 2. Decode Seed
    const configData = SeedManager.decode(encodedSeedStr);
    
    // 3. Khởi tạo đối tượng map
    if(animationTimeout) clearTimeout(animationTimeout);
    currentGraphGen = new GraphGenerator(configData.nodeCount, configData.complexity, configData.rawNumericSeed, configData.isHardMode);
    adjacencyList = currentGraphGen.generate();
    
    // Thu thập màn hình vẽ
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nodes = currentGraphGen.generateLayout(canvas.width, canvas.height, graphArea.padding);

    // Xóa state cũ
    visitedEdges.clear();
    pathStack = [];
    isDragging = false;
    
    // Xóa state tự build
    selectedFixNode = null;
    originalAdjacencyList = null;
    failCount = 0;
    maxFixConnections = 0;
    currentFixConnections = 0;
    
    // Về Giai đoạn Phân tích
    currentPhase = PHASE_ANALYSIS;
    document.getElementById('analysis-overlay').style.display = 'flex';
    document.getElementById('analysis-feedback').innerText = '';
    document.getElementById('btn-hint').style.display = 'none';

    render();
    renderGraphDataInfo();
}

// Rendering Data Panel cho Sidebar Trái
function renderGraphDataInfo() {
    if (!currentGraphGen) return;
    
    // 1. Render Adjacency List
    const ul = document.getElementById('adjacency-list-ul');
    ul.innerHTML = '';
    
    const entries = Array.from(adjacencyList.entries()).sort((a,b) => a[0] - b[0]);
        
    for (const [node, neighbors] of entries) {
        let sortedNeighbors = [...neighbors].sort((a,b) => a - b);
        let li = document.createElement('li');
        li.className = 'routing-item';
        li.innerHTML = `<strong>Đỉnh ${node}</strong> ➔ ${sortedNeighbors.join(', ')}`;
        ul.appendChild(li);
    }
    
    // 2. Render Adjacency Matrix
    const table = document.getElementById('adjacency-matrix-table');
    table.innerHTML = '';
    
    let thead = document.createElement('thead');
    let htr = document.createElement('tr');
    htr.appendChild(document.createElement('th')); // empty corner
    for (let i = 0; i < currentGraphGen.nodeCount; i++) {
        let th = document.createElement('th');
        th.innerText = i;
        htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);
    
    let tbody = document.createElement('tbody');
    for (let i = 0; i < currentGraphGen.nodeCount; i++) {
        let tr = document.createElement('tr');
        let thRow = document.createElement('th');
        thRow.innerText = i;
        tr.appendChild(thRow);
        
        for (let j = 0; j < currentGraphGen.nodeCount; j++) {
            let td = document.createElement('td');
            td.id = `matrix-cell-${i}-${j}`;
            let hasEdge = adjacencyList.get(i).includes(j);
            td.innerText = hasEdge ? '1' : '0';
            td.className = hasEdge ? 'm-conn' : 'm-none';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    
    // Khởi tạo trạng thái lần đầu
    updateSidebarGraphUI();
}

function updateSidebarGraphUI() {
    if (!currentGraphGen) return;

    // 1. Cập nhật chuỗi Đường đi hiện tại
    const pathStrEl = document.getElementById('path-string');
    if (pathStack.length === 0) {
        pathStrEl.innerText = 'Chưa có';
    } else {
        pathStrEl.innerText = pathStack.join(' ➔ ');
    }
    
    // 2. Cập nhật Ma trận đồ thị nếu đã đi qua
    for (let i = 0; i < currentGraphGen.nodeCount; i++) {
        if (!adjacencyList.has(i)) continue;
        for (let j = 0; j < currentGraphGen.nodeCount; j++) {
            const td = document.getElementById(`matrix-cell-${i}-${j}`);
            if (!td) continue;

            const isEdge = adjacencyList.get(i).includes(j);
            if (isEdge) {
                const min = Math.min(i, j);
                const max = Math.max(i, j);
                const edgeKey = `${min}-${max}`;
                
                if (visitedEdges && visitedEdges.has(edgeKey)) {
                    td.className = 'm-visited';
                    td.innerText = 'x'; // Mờ và biến thành x
                } else {
                    td.className = 'm-conn';
                    td.innerText = '1';
                }
            }
        }
    }
}

// Logic kiểm tra Giai đoạn 1: Phân tích Đồ thị
function checkGraphTypeGuess(guessedType) {
    // Tính bậc các đỉnh
    let oddDegreeCount = 0;
    if (currentGraphGen && currentGraphGen.isHardMode) {
        let inDegree = new Array(currentGraphGen.nodeCount).fill(0);
        let outDegree = new Array(currentGraphGen.nodeCount).fill(0);
        for (const [node, neighbors] of adjacencyList.entries()) {
            outDegree[node] = neighbors.length;
            for (let v of neighbors) {
                inDegree[v]++;
            }
        }
        for (let i = 0; i < inDegree.length; i++) {
            if (inDegree[i] !== outDegree[i]) oddDegreeCount++;
        }
    } else {
        for (const [node, neighbors] of adjacencyList.entries()) {
            if (neighbors.length % 2 !== 0) {
                oddDegreeCount++;
            }
        }
    }

    let actualType = 0; // Mặc định chu trình (0 đỉnh lẻ)
    if (oddDegreeCount === 2) actualType = 1; // Đường đi
    else if (oddDegreeCount > 2) actualType = 2; // Không Euler

    if (guessedType === actualType) {
        document.getElementById('analysis-feedback').style.color = '#10b981';
        document.getElementById('analysis-feedback').innerText = 'Chính xác! Bắt đầu kết nối mạng lưới...';
        
        if (actualType === 2) {
            // Không phải Euler -> Cho người chơi tự nối
            setTimeout(() => {
                let oddCount = 0;
                if (currentGraphGen && currentGraphGen.isHardMode) {
                    let inDegree = new Array(currentGraphGen.nodeCount).fill(0);
                    let outDegree = new Array(currentGraphGen.nodeCount).fill(0);
                    for (const [node, neighbors] of adjacencyList.entries()) {
                        outDegree[node] = neighbors.length;
                        for (let v of neighbors) {
                            inDegree[v]++;
                        }
                    }
                    for (let i = 0; i < inDegree.length; i++) {
                        if (inDegree[i] !== outDegree[i]) oddCount++;
                    }
                    // For directed graphs, we need pairs to fix them
                    maxFixConnections = oddCount > 2 ? oddCount / 2 - 1 : 0;
                } else {
                    for (let [node, edges] of adjacencyList.entries()) {
                        if (edges.length % 2 !== 0) oddCount++;
                    }
                    maxFixConnections = (oddCount / 2) - 1;
                }
                currentFixConnections = 0;

                alert(`Hệ thống hiện tại không thể đồng bộ liên tục!\nTRẠNG THÁI SỬA CHỮA: Hãy tìm và xác định các ngôi sao lẻ, sau đó sử dụng giao thức kết nối các ngôi sao đó. Khi ấn vào 1 ngôi sao (đỉnh) sẽ thắp sáng, ấn sang ngôi sao khác để thêm giao thức hoặc ấn lại để hủy, cho phép số giao thức kết nối là ${maxFixConnections}`);
                
                // Sao lưu lại trạng thái gốc
                originalAdjacencyList = new Map();
                for (let [k, v] of adjacencyList.entries()) {
                    originalAdjacencyList.set(k, [...v]);
                }
                
                document.getElementById('analysis-overlay').style.display = 'none';
                currentPhase = PHASE_FIXING;
                render();
            }, 1000);
        } else {
            // Đã là Euler / Đường Euler sẵn -> Qua vẽ luôn
            setTimeout(() => {
                document.getElementById('analysis-overlay').style.display = 'none';
                currentPhase = PHASE_DRAWING;
                document.getElementById('btn-hint').style.display = 'inline-block';
            }, 1500);
        }
    } else {
        document.getElementById('analysis-feedback').style.color = '#ef4444';
        document.getElementById('analysis-feedback').innerText = 'Phân tích sai! Hãy đếm kỹ lại số đỉnh có số đường dẫn là số lẻ.';
    }
}

// Kiểm tra "Cạnh Cầu" (Thuật toán Fleury)
function isBridge(u, v) {
    if (currentGraphGen && currentGraphGen.isHardMode) {
        return false; // Skip strict Fleury checking for hard mode
    }
    
    // 1. Phân tích Sub-graph gồm các cạnh CHƯA đi qua
    let adjRemaining = new Map();
    for(let i=0; i<nodes.length; i++) adjRemaining.set(i, []);
    
    for (const [node, neighbors] of adjacencyList.entries()) {
        for (const target of neighbors) {
            if (node < target) {
                const edgeKey = getEdgeKey(node, target);
                if (!visitedEdges.has(edgeKey)) {
                    adjRemaining.get(node).push(target);
                    adjRemaining.get(target).push(node);
                }
            }
        }
    }

    // 2. Nếu u chỉ còn 1 cạnh bám vào nó -> Chắc chắn cạnh đi qua không vi phạm (Bắt buộc phải đi)
    if (adjRemaining.get(u).length <= 1) {
        return false;
    }

    // 3. Nếu u còn >1 cạnh. Đếm số đỉnh liên thông có thể với tới TỪ u trước khi xóa cạnh u-v
    let countBefore = countReachableNodesBFS(u, adjRemaining, null);
    
    // Đếm số đỉnh liên thông nếu Gỉa sử gỡ bỏ cạnh u-v
    let countAfter = countReachableNodesBFS(u, adjRemaining, getEdgeKey(u, v));

    // Nếu số đỉnh reach được giảm xuống => cạnh này là CẦU (Bridge)
    return countAfter < countBefore;
}

function countReachableNodesBFS(startNode, adjMap, ignoredEdgeKey) {
    let visited = new Set();
    let queue = [startNode];
    visited.add(startNode);
    let count = 0;

    while (queue.length > 0) {
        let curr = queue.shift();
        count++;
        for (let target of adjMap.get(curr)) {
            if (ignoredEdgeKey && getEdgeKey(curr, target) === ignoredEdgeKey) {
                continue; // Bỏ qua cạnh bị giả vờ cắt
            }
            if (!visited.has(target)) {
                visited.add(target);
                queue.push(target);
            }
        }
    }
    return count;
}

function showHint() {
    if (!currentGraphGen) return;
    
    // Reset path hiện tại
    visitedEdges.clear();
    pathStack = [];
    if(animationTimeout) clearTimeout(animationTimeout);
    
    // Lấy chu trình Euler đúng bằng Hierholzer
    const eulerPath = currentGraphGen.findEulerianPath();
    
    if (!eulerPath || eulerPath.length === 0) return;
    
    // Animation draw từng cạnh một
    let step = 0;
    pathStack.push(eulerPath[0]); // Đỉnh xuất phát
    
    function animateNext() {
        if (step >= eulerPath.length - 1) return;
        
        let u = eulerPath[step];
        let v = eulerPath[step + 1];
        
        visitedEdges.add(getEdgeKey(u, v));
        pathStack.push(v);
        
        render(); // Force redraw UI
        
        step++;
        animationTimeout = setTimeout(animateNext, 300); // Tốc độ delay giữa các bước vẽ: 300ms
    }
    
    animateNext();
}

function initGame() {
    // Khởi động Offline Local
    const isHard = document.getElementById('chk-hard-mode') ? document.getElementById('chk-hard-mode').checked : false;
    const encodedSeedStr = SeedManager.encode(getRandomNodeCount(), COMPLEXITY, LEVEL_ID, isHard);
    generateGame(encodedSeedStr);

    connectMultiplayer();

    // Event Listeners cho nút local
    document.getElementById('btn-undo').onclick = undoMove;
    document.getElementById('btn-hint').onclick = showHint;
    document.getElementById('btn-restart').onclick = () => {
        if(animationTimeout) clearTimeout(animationTimeout);
        pathStack = [];
        visitedEdges.clear();
        failCount = 0; // Reset fail khi vẽ lại từ đầu chặng
        render();
    };

    document.getElementById('btn-new-game').onclick = () => {
        if(animationTimeout) clearTimeout(animationTimeout);
        const isHard = document.getElementById('chk-hard-mode').checked;
        generateGame(SeedManager.encode(getRandomNodeCount(), COMPLEXITY, LEVEL_ID, isHard)); 
    };

    // Event buttons phân tích đồ thị Phase 0
    document.getElementById('btn-guess-circuit').onclick = () => checkGraphTypeGuess(0);
    document.getElementById('btn-guess-path').onclick = () => checkGraphTypeGuess(1);
    document.getElementById('btn-guess-none').onclick = () => checkGraphTypeGuess(2);

    document.getElementById('btn-toggle-graph-view').onclick = () => {
        isMatrixView = !isMatrixView;
        if (isMatrixView) {
            document.getElementById('adjacency-list-view').style.display = 'none';
            document.getElementById('adjacency-matrix-view').style.display = 'block';
            document.getElementById('btn-toggle-graph-view').innerText = 'Hiển thị Danh sách';
        } else {
            document.getElementById('adjacency-list-view').style.display = 'block';
            document.getElementById('adjacency-matrix-view').style.display = 'none';
            document.getElementById('btn-toggle-graph-view').innerText = 'Hiển thị Ma trận';
        }
    };

    // Setup input listeners
    setupInputHandling();
}

function setupInputHandling() {
    // Lấy tọa độ tương đối với canvas
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        // Support cho cả touch và mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const getHoveredNode = (pos) => {
        const HitRadius = 20; // Hitbox bự hơn vẽ một chút
        return nodes.find(n => {
            const dx = n.x - pos.x;
            const dy = n.y - pos.y;
            return Math.sqrt(dx*dx + dy*dy) <= HitRadius;
        });
    };

    const onDown = (e) => {
        if (currentPhase === PHASE_ANALYSIS) return; 

        e.preventDefault();
        const pos = getPos(e);
        const hovered = getHoveredNode(pos);
        
        // --- XỬ LÝ PHA TỰ NỐI ĐỈNH (PHASE_FIXING) ---
        if (currentPhase === PHASE_FIXING) {
            if (hovered) {
                if (selectedFixNode === null) {
                    selectedFixNode = hovered.id; // Chọn đỉnh 1
                } else if (selectedFixNode !== hovered.id) {
                    // Chọn đỉnh 2: Nối 2 đỉnh lại nếu chưa có cạnh
                    if (!adjacencyList.get(selectedFixNode).includes(hovered.id)) {
                        if (currentFixConnections < maxFixConnections) {
                            currentGraphGen.addEdge(selectedFixNode, hovered.id);
                            adjacencyList = currentGraphGen.adjacencyList;
                            selectedFixNode = null;
                            currentFixConnections++;
                            
                            let oddCount = 0;
                            if (currentGraphGen && currentGraphGen.isHardMode) {
                                let inDegree = new Array(currentGraphGen.nodeCount).fill(0);
                                let outDegree = new Array(currentGraphGen.nodeCount).fill(0);
                                for (const [node, neighbors] of adjacencyList.entries()) {
                                    outDegree[node] = neighbors.length;
                                    for (let val of neighbors) inDegree[val]++;
                                }
                                for (let i = 0; i < inDegree.length; i++) {
                                    if (inDegree[i] !== outDegree[i]) oddCount++;
                                }
                            } else {
                                for (let [node, edges] of adjacencyList.entries()) {
                                    if (edges.length % 2 !== 0) oddCount++;
                                }
                            }
                            if (oddCount <= 2) {
                                alert("Mạng lưới đã ổn định tiêu chuẩn năng lượng! Bây giờ hãy tìm đường đi...");
                                currentPhase = PHASE_DRAWING; // Thoát phase
                                document.getElementById('btn-hint').style.display = 'inline-block';
                            } else if (currentFixConnections >= maxFixConnections) {
                                alert("Bạn đã dùng hết số giao thức kết nối cho phép nhưng mạng lưới vẫn chưa ổn định. Hãy Hủy các giao thức sai để thử lại!");
                            }
                        } else {
                            alert("Bạn đã hết lượt tạo giao thức kết nối!");
                            selectedFixNode = null;
                        }
                    } else {
                        // Cạnh đã tồn tại: 
                        // Kiểm tra xem đây có phải là cạnh do người chơi vừa thêm không?
                        let wasInOriginal = originalAdjacencyList.get(selectedFixNode).includes(hovered.id);
                        if (!wasInOriginal) {
                            // Hủy cạnh
                            currentGraphGen._removeEdge(selectedFixNode, hovered.id);
                            adjacencyList = currentGraphGen.adjacencyList;
                            selectedFixNode = null;
                            currentFixConnections--;
                        } else {
                            // Cạnh gốc của map -> Chuyển Selection sang đỉnh mới này
                            selectedFixNode = hovered.id;
                        }
                    }
                } else {
                    selectedFixNode = null; // Bấm lại chính nó -> Hủy chọn
                }
                render();
            }
            return;
        }

        // --- XỬ LÝ PHA VẼ THÔNG THƯỜNG ---
        if (hovered && pathStack.length === 0) {
            pathStack.push(hovered.id);
            isDragging = true;
            mousePos = pos;
        } 
        // Bắt đầu vuốt tiếp từ node hiện tại nếu đang ở đó
        else if (hovered && pathStack.length > 0 && hovered.id === pathStack[pathStack.length - 1]) {
            isDragging = true;
            mousePos = pos;
        }
        render();
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        mousePos = getPos(e);

        const currentId = pathStack[pathStack.length - 1];
        const hovered = getHoveredNode(mousePos);

        if (hovered && hovered.id !== currentId) {
            // Kiểm tra xem neighbor có kề không và cạnh chưa đi
            const neighbors = adjacencyList.get(currentId);
            if (neighbors.includes(hovered.id)) {
                const edgeKey = getEdgeKey(currentId, hovered.id);
                if (!visitedEdges.has(edgeKey)) {
                    
                    // KIỂM TRA LUẬT FLEURY THỜI GIAN THỰC
                    if (isBridge(currentId, hovered.id)) {
                        isDragging = false;
                        render();
                        
                        setTimeout(() => {
                            alert("Cảnh báo đứt Cáp Năng lượng! Bạn đã vẽ vào một Giao Điểm Cầu trong khi còn nhánh khác. Thuật toán báo lỗi rẽ nhánh!");
                            undoMove();
                            
                            // Check fail count đối với các map tự build
                            if (originalAdjacencyList !== null) {
                                failCount++;
                                if (failCount >= 3) {
                                    if (confirm("Hệ thống phát hiện bạn gặp bế tắc 3 lần liên tiếp. Liên kết bạn tự tạo có thể đang khiến map không thể giải được.\nBạn có muốn XÓA TẤT CẢ nút đã nối để Tự thiết kế lại map từ đầu không?")) {
                                        // Reset lại về Map do thuật toán tạo ở Phase 0
                                        adjacencyList = new Map();
                                        for (let [k, v] of originalAdjacencyList.entries()) {
                                            adjacencyList.set(k, [...v]);
                                        }
                                        currentGraphGen.adjacencyList = adjacencyList;
                                        
                                        currentPhase = PHASE_FIXING;
                                        failCount = 0;
                                        visitedEdges.clear();
                                        pathStack = [];
                                        document.getElementById('btn-hint').style.display = 'none';
                                        alert("Hãy click chọn các đỉnh để nối lại!");
                                        render();
                                    } else {
                                        failCount = 0; // Reset để ko spam
                                    }
                                }
                            }

                        }, 50);
                        return; // Ngắt đường vẽ
                    }

                    // Chấp nhận nối
                    visitedEdges.add(edgeKey);
                    pathStack.push(hovered.id);
                }
            }
        }
        render();
    };

    const onUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        mousePos = null;
        render();
        checkWinCondition();
    };

    // Chuột
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp); // Window để không bị kẹt khi nhả chuột ngoài canvas

    // Cảm ứng
    canvas.addEventListener('touchstart', onDown, {passive: false});
    canvas.addEventListener('touchmove', onMove, {passive: false});
    window.addEventListener('touchend', onUp);
}

function undoMove() {
    if (pathStack.length <= 1) {
        pathStack = []; // Reset hoàn toàn nếu chỉ còn 1
    } else {
        const lastNode = pathStack.pop();
        const previousNode = pathStack[pathStack.length - 1];
        const edgeKey = getEdgeKey(lastNode, previousNode);
        visitedEdges.delete(edgeKey);
    }
    render();
}

function checkWinCondition() {
    let totalEdges = 0;
    for (const [node, neighbors] of adjacencyList.entries()) {
        totalEdges += neighbors.length;
    }
    if (!currentGraphGen || !currentGraphGen.isHardMode) {
        totalEdges /= 2; // Chia 2 vì mỗi cạnh lưu 2 lần ở chế độ vô hướng
    }

    if (visitedEdges.size === totalEdges) {
        if(timerInterval) clearInterval(timerInterval);
        const timeTaken = gameStartTime ? Date.now() - gameStartTime : 0;

        // Nếu đang ở trong phòng Multiplayer thì gửi kết quả lên Server
        if(socket && currentRoomId && gameStartTime) {
            socket.emit('SUBMIT_RESULT', {
                roomId: currentRoomId,
                pathStack: pathStack,
                timeTaken: timeTaken
            });
        }

        // Tạm cheat set timeout nhỏ để UI render xong line cuối trước
        setTimeout(() => alert(`🎉 Tuyệt vời! Đồng bộ hóa Mạng lưới Hoàn tất!${timeTaken ? ' Thời gian: ' + (timeTaken/1000).toFixed(2) + 's' : ''}`), 50);
    }
}

function render() {
    // 1. Xóa background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Vẽ tất cả các cạnh nền (Edges mờ)
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let renderedRawEdges = new Set();
    for (const [nodeIndex, neighbors] of adjacencyList.entries()) {
        const fromNode = nodes[nodeIndex];
        for (const targetIdx of neighbors) {
            const edgeKey = getEdgeKey(nodeIndex, targetIdx);
            if (renderedRawEdges.has(edgeKey)) continue; // Tránh vẽ đè cạnh vô hướng
            renderedRawEdges.add(edgeKey);
            
            const toNode = nodes[targetIdx];
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            
            // Highlight nếu cạnh đã đi qua
            if (visitedEdges.has(edgeKey)) {
                ctx.strokeStyle = '#f59e0b'; // Line màu cam/vàng nêon
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f59e0b';
                ctx.lineWidth = 4;
            } else {
                ctx.strokeStyle = '#334155'; // Line nền tối màu
                ctx.shadowBlur = 0;
                ctx.lineWidth = 3;
            }
            
            ctx.stroke();
            
            // Vẽ mũi tên điều hướng ở chính giữa cạnh nếu ở chế độ Hard Mode
            if (currentGraphGen && currentGraphGen.isHardMode) {
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;
                const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
                
                ctx.beginPath();
                ctx.moveTo(midX + 5 * Math.cos(angle), midY + 5 * Math.sin(angle)); // Nhích tới trước để mũi tên đúng tâm
                ctx.lineTo(midX - 10 * Math.cos(angle - Math.PI / 6), midY - 10 * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(midX - 10 * Math.cos(angle + Math.PI / 6), midY - 10 * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                
                ctx.fillStyle = visitedEdges.has(edgeKey) ? '#f59e0b' : '#94a3b8';
                if (visitedEdges.has(edgeKey)) {
                     ctx.shadowBlur = 10;
                     ctx.shadowColor = '#f59e0b';
                }
                ctx.fill();
                ctx.shadowBlur = 0; // reset
            }
        }
    }
    
    // 3. Vẽ line đang kéo chưa chạm node (Preview)
    if (isDragging && pathStack.length > 0 && mousePos) {
        ctx.beginPath();
        const startNode = nodes[pathStack[pathStack.length - 1]];
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = '#38bdf8'; // Màu kéo xanh dương
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.shadowBlur = 0; // Reset shadow cho Nodes

    // 4. Vẽ các đỉnh
    for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 14, 0, 2 * Math.PI);
        
        // Kiểm tra xem có phải đỉnh lẻ ở phase fixing không
        let isOdd = false;
        if (currentPhase === PHASE_FIXING) {
            if (currentGraphGen && currentGraphGen.isHardMode) {
                let inDegree = 0, outDegree = adjacencyList.get(n.id).length;
                for (const [modNode, neighbors] of adjacencyList.entries()) {
                    if (neighbors.includes(n.id)) inDegree++;
                }
                isOdd = inDegree !== outDegree;
            } else {
                isOdd = adjacencyList.get(n.id).length % 2 !== 0;
            }
        }

        if (currentPhase === PHASE_FIXING && selectedFixNode === n.id) {
            // Đỉnh đang chọn ở Phase Fixing được thắp sáng
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#38bdf8';
        } else if (currentPhase === PHASE_FIXING && isOdd) {
            // Ngôi sao lẻ ở Phase Fixing (nhấp nháy đỏ hoặc viền đỏ)
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
        } else if (pathStack.length > 0 && n.id === pathStack[pathStack.length - 1] && currentPhase === PHASE_DRAWING) {
            // Đỉnh hiện tại (Mới nhất)
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
        } else if (pathStack.includes(n.id)) {
            // Đỉnh đã qua
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
        } else {
            // Đỉnh trống
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
        }
        
        ctx.fill();
        ctx.stroke();
        
        // Label Text
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.id, n.x, n.y);
    }
    
    // Cập nhật ma trận và đường đi mỗi khi có thay đổi render
    updateSidebarGraphUI();
}

window.addEventListener('load', () => {
    initGame();
});
