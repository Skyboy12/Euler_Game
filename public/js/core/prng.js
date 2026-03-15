// PRNG: Mulberry32
// Thuật toán phát sinh số ngẫu nhiên có độ phân tán tốt dựa trên seed nguyên thủy 32-bit.
export function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Seed Decoder & Encoder: Nén dữ liệu (Ví dụ: số đỉnh, độ phức tạp) sang chuỗi ngắn gọn.
export class SeedManager {
    // encode thông số từ các tham số để tạo seed string.
    static encode(nodeCount, complexity, levelId) {
        // Tạo một mã random thật sự bằng Timestamp kết hợp Math.random
        const rawEntropy = (Date.now() % 100000) + Math.floor(Math.random() * 100000);
        // Gộp các giá trị thành 1 số nguyên lớn: raw + levelId + nodeCount + complexity
        const combined = (levelId * 10000000) + ((nodeCount * 100) + complexity) * 100000 + rawEntropy;
        return combined.toString(36).toUpperCase();
    }

    // decode seed string ra các biến cấu hình ban đầu, kèm một initial integer seed.
    static decode(seedStr) {
        const val = parseInt(seedStr, 36);
        const rawEntropy = val % 100000;
        const remaining = Math.floor(val / 100000);
        const complexity = remaining % 100;
        const nodeCount = Math.floor(remaining / 100) % 100;
        const levelId = Math.floor(remaining / 10000);
        return {
            levelId,
            nodeCount,
            complexity,
            rawNumericSeed: rawEntropy + levelId + nodeCount // Seed cuối cho thuật toán sinh map
        };
    }
}
