// Thuật toán tạo đồ thị chứa chu trình Euler hoặc đường Euler
export class GraphGenerator {
    // rawNumericSeed: Số nguyên để cấp cho PRNG (mulberry32).
    // nodeCount: Số lượng đỉnh cần vẽ.
    // complexity: Chỉ số về chi tiết hoặc số cung (edges).
    constructor(nodeCount, complexity, rawNumericSeed, isHardMode = false) {
        this.nodeCount = nodeCount;
        this.complexity = complexity;
        this.seed = rawNumericSeed;
        this.isHardMode = isHardMode;
        
        // Khởi tạo đồ thị mảng kề (Adjacency List)
        this.adjacencyList = new Map();
        for (let i = 0; i < nodeCount; i++) {
            this.adjacencyList.set(i, []);
        }

        // Tạo hàm random
        this.random = this._createPRNG(this.seed);
    }

    _createPRNG(seed) {
        let t = seed += 0x6D2B79F5;
        return function() {
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // Lấy số int trong khoảng min -> max
    _randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Thêm cạnh
    addEdge(v1, v2) {
        if (v1 === v2) return; // Không vẽ cạnh self-loop cho game
        
        // Kiểm tra tránh trùng lặp nếu chưa cần thiết
        if (!this.adjacencyList.get(v1).includes(v2)) {
            this.adjacencyList.get(v1).push(v2);
            if (!this.isHardMode) {
                if (!this.adjacencyList.get(v2).includes(v1)) {
                    this.adjacencyList.get(v2).push(v1);
                }
            }
        }
    }

    // Bước 1: Tạo chu trình Hamilton kết nối tất cả nút để đảm bảo liên thông
    _createHamiltonianCircuit() {
        const nodes = Array.from({length: this.nodeCount}, (_, i) => i);
        // Shuffle nodes tạo random path
        for (let i = nodes.length - 1; i > 0; i--) {
            const j = this._randInt(0, i);
            [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
        }

        // Nối i -> i+1, và cuối cùng vòng lại
        for (let i = 0; i < nodes.length - 1; i++) {
            this.addEdge(nodes[i], nodes[i + 1]);
        }
        this.addEdge(nodes[nodes.length - 1], nodes[0]); // Đóng mạch
    }

    _removeEdge(u, v) {
        let adjU = this.adjacencyList.get(u);
        let adjV = this.adjacencyList.get(v);
        if (adjU.includes(v)) adjU.splice(adjU.indexOf(v), 1);
        if (!this.isHardMode) {
            if (adjV.includes(u)) adjV.splice(adjV.indexOf(u), 1);
        }
    }

    // Bước 2: Thêm các cạnh ngẫu nhiên tạo vòng lặp phụ 
    // Yêu cầu của Euler mạch: Mọi đỉnh phải có bậc CHẴN (để tạo chu trình Euler)
    _addAdditionalCycles(numCycles) {
        for (let i = 0; i < numCycles; i++) {
            // Chọn ngẫu nhiên 3 đỉnh (hoặc nhiều hơn) để tạo vòng lặp chẵn
            let v1 = this._randInt(0, this.nodeCount - 1);
            let v2 = this._randInt(0, this.nodeCount - 1);
            let v3 = this._randInt(0, this.nodeCount - 1);

            while (v1 === v2 || v2 === v3 || v1 === v3) {
                v2 = this._randInt(0, this.nodeCount - 1);
                v3 = this._randInt(0, this.nodeCount - 1);
            }

            this.addEdge(v1, v2);
            this.addEdge(v2, v3);
            this.addEdge(v3, v1);
        }
    }

    // Master function tạo map
    generate() {
        this._createHamiltonianCircuit();
        this._addAdditionalCycles(this.complexity); // số chu trình phụ theo biến complexity
        
        // Tạo ngẫu nhiên thể loại đồ thị cho Bước Kiểm Tra
        // 0: Chu trình Euler (Toàn bậc chẵn) - KHÔNG LÀM GÌ CẢ
        // 1: Đường đi Euler (2 điểm bậc lẻ)
        // 2: Không phải đồ thị Euler (4 điểm bậc lẻ)
        let typeChance = this._randInt(0, 100);
        let numEdgesToRemove = 0;
        
        if (typeChance < 33) {
            numEdgesToRemove = 1; // Tạo ra 2 đỉnh bậc lẻ
        } else if (typeChance < 66) {
            numEdgesToRemove = 2; // Xóa 2 cạnh độc lập -> Tạo ra 4 đỉnh bậc lẻ
        }

        for(let k=0; k < numEdgesToRemove; k++) {
            // Tìm một cạnh ngẫu nhiên không phải là cầu (để không làm mất tính liên thông)
            let allEdges = [];
            for (let [node, neighbors] of this.adjacencyList.entries()) {
                for(let n of neighbors) {
                    if (this.isHardMode || node < n) {
                        allEdges.push([node, n]);
                    }
                }
            }

            // Shuffle edges
            for (let i = allEdges.length - 1; i > 0; i--) {
                const j = this._randInt(0, i);
                [allEdges[i], allEdges[j]] = [allEdges[j], allEdges[i]];
            }

            // Xóa thử cạnh và kiểm tra nếu vẫn liên thông
            for (let [u, v] of allEdges) {
                this._removeEdge(u, v);
                
                // BFS check liên thông YẾU (Weakly Connected)
                let visited = new Set();
                let queue = [0];
                visited.add(0);
                while(queue.length > 0) {
                    let curr = queue.shift();
                    
                    let neighbors = [...this.adjacencyList.get(curr)];
                    for (let [node, edges] of this.adjacencyList.entries()) {
                        if (edges.includes(curr) && !neighbors.includes(node)) {
                            neighbors.push(node);
                        }
                    }
                    
                    for(let n of neighbors) {
                        if(!visited.has(n)) {
                            visited.add(n);
                            queue.push(n);
                        }
                    }
                }
                
                if (visited.size === this.nodeCount) {
                    break; // Pass check, đồ thị vẫn liên thông
                } else {
                    this.addEdge(u, v); // Bị mất liên thông, roll back
                }
            }
        }

        return this.adjacencyList;
    }

    // Đã chỉnh sửa: findEulerianPath Debug (trả về log các bước duyệt bao gồm cả backtrack)
    findEulerianPathDebug() {
        let adj = new Map();
        for (let [node, neighbors] of this.adjacencyList.entries()) {
            // Sắp xếp tăng dần để ưu tiên duyệt đỉnh nhỏ trước (giống C++)
            adj.set(node, [...neighbors].sort((a, b) => a - b));
        }
        
        const totalEdges = Array.from(this.adjacencyList.values()).reduce((sum, n) => sum + n.length, 0) / (this.isHardMode ? 1 : 2);
        const pathLog = []; // [{type: 'move', u, v}, {type: 'backtrack', u, v}]
        const currentPath = [];
        const visited = new Set();

        let startNode = 0;
        if (this.isHardMode) {
            let inDegree = new Array(this.nodeCount).fill(0);
            let outDegree = new Array(this.nodeCount).fill(0);
            for (let [u, neighbors] of this.adjacencyList.entries()) {
                outDegree[u] = neighbors.length;
                for (let v of neighbors) inDegree[v]++;
            }
            for (let i = 0; i < this.nodeCount; i++) {
                if (outDegree[i] - inDegree[i] === 1) { startNode = i; break; }
            }
        } else {
            for (let [node, neighbors] of this.adjacencyList.entries()) {
                if (neighbors.length % 2 !== 0) { startNode = node; break; }
            }
        }

        const solve = (u) => {
            currentPath.push(u);
            if (visited.size === totalEdges) return true;

            const neighbors = [...adj.get(u)];
            for (const v of neighbors) {
                const edgeKey = this.isHardMode ? `${u}-${v}` : (u < v ? `${u}-${v}` : `${v}-${u}`);
                if (!visited.has(edgeKey)) {
                    visited.add(edgeKey);
                    pathLog.push({ type: 'move', u, v });
                    
                    if (solve(v)) return true;
                    
                    // Backtrack
                    visited.delete(edgeKey);
                    pathLog.push({ type: 'backtrack', u, v });
                }
            }
            currentPath.pop();
            return false;
        };

        solve(startNode);
        return {
            finalPath: currentPath,
            log: pathLog
        };
    }

    // Thuật toán Hierholzer để tìm chu trình / Đường đi Euler (Sử dụng cho hint chính xác)
    findEulerianPath() {
        let adj = new Map();
        // Deep copy và sắp xếp giảm dần để pop() lấy đỉnh nhỏ nhất trước (khớp C++)
        for (let [node, neighbors] of this.adjacencyList.entries()) {
            adj.set(node, [...neighbors].sort((a, b) => b - a));
        }

        let edgeCount = new Map();
        for (let [node, neighbors] of adj.entries()) {
            edgeCount.set(node, neighbors.length);
        }

        if (adj.size === 0) return [];

        let startNode = 0;
        
        if (this.isHardMode) {
            let inDegree = new Array(this.nodeCount).fill(0);
            let outDegree = new Array(this.nodeCount).fill(0);
            for (let [u, neighbors] of adj.entries()) {
                outDegree[u] = neighbors.length;
                for (let v of neighbors) {
                    inDegree[v]++;
                }
            }
            for (let i = 0; i < this.nodeCount; i++) {
                if (outDegree[i] - inDegree[i] === 1) {
                    startNode = i;
                    break;
                }
            }
        } else {
            let oddNodes = [];
            for (let [node, count] of edgeCount.entries()) {
                if (count % 2 !== 0) {
                    oddNodes.push(node);
                }
            }
            if (oddNodes.length > 0) {
                startNode = oddNodes[0];
            }
        }

        let currPath = [startNode];
        let circuit = [];

        while (currPath.length > 0) {
            let currNode = currPath[currPath.length - 1];

            if (edgeCount.get(currNode) > 0) {
                let nextNode = adj.get(currNode).pop();
                edgeCount.set(currNode, edgeCount.get(currNode) - 1);
                
                // Cần xóa cạnh theo cả chiều ngược lại (vì là đồ thị vô hướng)
                if (!this.isHardMode) {
                    let nextAdj = adj.get(nextNode);
                    let idx = nextAdj.indexOf(currNode);
                    if (idx > -1) {
                        nextAdj.splice(idx, 1);
                        edgeCount.set(nextNode, edgeCount.get(nextNode) - 1);
                    }
                }

                currPath.push(nextNode);
            } else {
                circuit.push(currPath.pop());
            }
        }
        
        return circuit.reverse(); // Mảng các ID đỉnh đi tuần tự
    }

    // Tùy chọn: Sinh tọa độ vật lý ngẫu nhiên cho Render
    // Dàn đều điểm theo hình tròn + độ nhiễu ngẫu nhiên nhỏ để các điểm không bị quá sát nhau
    generateLayout(width, height, padding) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - padding - 40; // Trừ hao để sát mép

        // Hàm tính khoảng cách từ điểm tới đoạn thẳng
        const pointSegmentDistance = (px, py, x1, y1, x2, y2) => {
            const l2 = (x2 - x1)**2 + (y2 - y1)**2;
            if (l2 === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
        };

        const maxAttempts = 50;
        let bestLayout = null;
        let minPenalty = Infinity;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const nodesData = [];
            let angles = [];
            for (let i=0; i<this.nodeCount; i++) {
                angles.push((i / this.nodeCount) * Math.PI * 2);
            }
            
            // Shuffle lại vị trí mảng để các NodeId không bị xếp tròn đều theo thứ tự 0,1,2..
            for (let i = angles.length - 1; i > 0; i--) {
                const j = this._randInt(0, i);
                [angles[i], angles[j]] = [angles[j], angles[i]];
            }

            for (let i = 0; i < this.nodeCount; i++) {
                let angle = angles[i];
                
                // Random khoảng cách xa tâm một chút (nhưng không đẩy vào tâm)
                // Lùi hoặc tiến 15% bán kính
                let rNoise = radius * (1.0 + (this.random() * 0.3 - 0.15));
                
                nodesData.push({
                    id: i,
                    x: centerX + rNoise * Math.cos(angle),
                    y: centerY + rNoise * Math.sin(angle)
                });
            }

            // --- KIỂM TRA OVERLAP VỚI CẠNH ---
            let hasCollision = false;
            let penalty = 0;
            const safeDistance = 35; // Nút có bán kính 14, nên 35 là đủ an toàn không bị cắt ngang

            let edgesChecked = new Set();
            for (let u = 0; u < this.nodeCount; u++) {
                for (let v of this.adjacencyList.get(u)) {
                    if (u < v) {
                        const edgeKey = u + "-" + v;
                        if (edgesChecked.has(edgeKey)) continue;
                        edgesChecked.add(edgeKey);

                        const n1 = nodesData.find(n => n.id === u);
                        const n2 = nodesData.find(n => n.id === v);

                        for (let k = 0; k < this.nodeCount; k++) {
                            if (k !== u && k !== v) {
                                const nk = nodesData.find(n => n.id === k);
                                const dist = pointSegmentDistance(nk.x, nk.y, n1.x, n1.y, n2.x, n2.y);
                                if (dist < safeDistance) {
                                    hasCollision = true;
                                    penalty += (safeDistance - dist);
                                }
                            }
                        }
                    }
                }
            }

            if (!hasCollision) {
                return nodesData; // Tìm được layout hoàn hảo
            }

            // Lưu lại layout ít lỗi nhất để backup
            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestLayout = nodesData;
            }
        }

        return bestLayout;
    }
}
