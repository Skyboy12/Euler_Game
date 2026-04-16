# The Cosmic Weaver (Trò chơi Sinh tồn - Lưới Năng Lượng)

The Cosmic Weaver là một tựa game giải đố trực tuyến hỗ trợ chơi đơn và Multiplayer dựa trên lý thuyết **Đồ thị Euler** trong Toán Rời Rạc. Người chơi đóng vai một thợ dệt vũ trụ, với nhiệm vụ thắp sáng các chòm sao bằng cách nối các ngôi sao theo một nét vẽ duy nhất mà không lặp lại bất kỳ tia năng lượng nào.

## 📖 Tài Liệu Chi Tiết

Để giữ cho README ngắn gọn, các chi tiết kỹ thuật và kiến thức về Toán học, thuật toán được chia thành các file riêng biệt tại thư mục `docs/`:

- **[Giải Thích Thuật Toán Euler & Sinh Đồ Thị](docs/algorithm.md)** - **TÂM ĐIỂM CỦA DỰ ÁN**
- [Cơ Chế Gameplay & Luật Chơi](docs/gameplay.md)
- [Hệ Thống Multiplayer & Anti-Cheat](docs/multiplayer.md)

## 🚀 Tính năng nổi bật

- **Thuật toán sinh map ngẫu nhiên (Procedural Generation):** Sử dụng PRNG (Mulberry32) và mã hóa hạt giống (Seed) để đảm bảo mọi người chơi chung một code sẽ có cùng một bản đồ giống hệt nhau mà không cần tải dữ liệu đồ thị nặng nề từ server.
- **Phân tích đồ thị:** Yêu cầu người chơi kiểm tra tính chất Euler của đồ thị trước khi vẽ (Bằng cách tự đếm số lượng đỉnh bậc lẻ).
- **Cơ chế sửa map (Fixing Phase):** Nếu đồ thị không phải là Euler (có nhiều hơn 2 đỉnh bậc lẻ), người chơi có thể tự khắc phục bằng cách thiết lập thêm giới hạn "giao thức kết nối" (Thêm/bớt các cạnh đồ thị vào hình dáng gốc).
- **Kiểm tra luật Fleury thời gian thực:** Game sẽ báo lỗi nếu bạn đi vào "Cạnh Cầu" (Bridge) có khả năng gây bế tắc nhánh (Dead end).
- **Hard Mode (Đường Một Chiều):** Hỗ trợ chuyển đổi đồ thị vô hướng thành đồ thị có hướng (Directed Graph) để tăng tư duy tính toán.
- **Mô hình Debug trực quan:** Hiển thị toàn bộ quá trình thuật toán "thử và sai" khi tìm đường. Các nhánh bị Backtracking (đi sai) được gom nhóm trong ngoặc lồng nhau `( )` giúp người chơi hiểu tại sao một hướng đi lại thất bại.
- **Tải Seed tùy chỉnh:** Người chơi có thể tự nhập mã Seed vào ô "Mã Seed..." để tái tạo ngay lập tức một bản đồ cụ thể, hỗ trợ việc chia sẻ thử thách giữa những người chơi.
- **WebSockets Multiplayer:** Thi đấu tốc độ thời gian thực với đồng đội qua Socket.IO. Kèm hệ thống xác thực đường đi chống gian lận (Anti-Cheat Server Validation).

## 🛠 Cài Đặt & Chạy Cục Bộ (Local)

1. Clone dự án về máy:
   ```bash
   git clone <repo-url>
   cd Euler
   ```
2. Cài đặt các thư viện Node.js:
   ```bash
   npm install
   ```
3. Khởi động server (Mặc định ở cổng 3000):
   ```bash
   npm start
   ```
   *Mẹo: Chạy `npm run dev` hoặc `node server/index.js` tuỳ the script.*
4. Truy cập Web Browser: `http://localhost:3000`

## 📁 Cấu trúc thư mục

- `public/`: Các Assets tĩnh của game (CSS, JS, HTML).
  - `js/core/graph.js`: Chứa lõi khởi tạo đồ thị và các thuật toán toán học (Hierholzer, Fleury).
  - `js/core/prng.js`: Các hàm tạo số ngẫu nhiên theo hạt giống.
  - `js/main.js`: Lõi logic điều hướng UI game, xử lý events chuột/cảm ứng, Multiplayer client sync.
  - `index.html`: Layout của game với khu vực Sidebar Dashboard và Canvas WebGL/2D.
- `server/`: Backend Node.js.
  - `index.js`: Socket.IO handling, Room management và Server-side Data Validation.
  - `replays.json`: Nơi máy chủ tự động vinh danh, lưu trữ Log người chiến thắng.
