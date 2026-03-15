// Thuật toán tạo đồ thị chứa chu trình Euler hoặc đường Euler
export class GraphGenerator {
    // rawNumericSeed: Số nguyên để cấp cho PRNG (mulberry32).
    // nodeCount: Số lượng đỉnh cần vẽ.
    // complexity: Chỉ số về chi tiết hoặc số cung (edges).
    constructor(nodeCount, complexity, rawNumericSeed) {
        this.nodeCount = nodeCount;
        this.complexity = complexity;
        this.seed = rawNumericSeed;
        
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

    // Thêm cạnh vô hướng
    addEdge(v1, v2) {
        if (v1 === v2) return; // Không vẽ cạnh self-loop cho game
        
        // Kiểm tra tránh trùng lặp nếu chưa cần thiết
        if (!this.adjacencyList.get(v1).includes(v2)) {
            this.adjacencyList.get(v1).push(v2);
            this.adjacencyList.get(v2).push(v1);
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
        if (adjV.includes(u)) adjV.splice(adjV.indexOf(u), 1);
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
                    if (node < n) allEdges.push([node, n]);
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
                
                // BFS check liên thông
                let visited = new Set();
                let queue = [0];
                visited.add(0);
                while(queue.length > 0) {
                    let curr = queue.shift();
                    for(let n of this.adjacencyList.get(curr)) {
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

    // Thuật toán Hierholzer để tìm chu trình / Đường đi Euler
    findEulerianPath() {
        let adj = new Map();
        // Deep copy danh sách kề
        for (let [node, neighbors] of this.adjacencyList.entries()) {
            adj.set(node, [...neighbors]);
        }

        let edgeCount = new Map();
        for (let [node, neighbors] of adj.entries()) {
            edgeCount.set(node, neighbors.length);
        }

        if (adj.size === 0) return [];

        // Tìm điểm xuất phát: Ưu tiên đỉnh bậc lẻ (nếu có đường đi Euler)
        let startNode = 0;
        let oddNodes = [];
        for (let [node, count] of edgeCount.entries()) {
            if (count % 2 !== 0) {
                oddNodes.push(node);
            }
        }
        if (oddNodes.length > 0) {
            startNode = oddNodes[0];
        }

        let currPath = [startNode];
        let circuit = [];

        while (currPath.length > 0) {
            let currNode = currPath[currPath.length - 1];

            if (edgeCount.get(currNode) > 0) {
                let nextNode = adj.get(currNode).pop();
                edgeCount.set(currNode, edgeCount.get(currNode) - 1);
                
                // Cần xóa cạnh theo cả chiều ngược lại (vì là đồ thị vô hướng)
                let nextAdj = adj.get(nextNode);
                let idx = nextAdj.indexOf(currNode);
                if (idx > -1) {
                    nextAdj.splice(idx, 1);
                    edgeCount.set(nextNode, edgeCount.get(nextNode) - 1);
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
        const nodesData = [];
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - padding - 40; // Trừ hao để sát mép

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
        return nodesData;
    }
}
