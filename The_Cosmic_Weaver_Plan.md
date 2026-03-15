### 📅 Kế hoạch Triển khai 5 Giai đoạn: The Cosmic Weaver

#### Giai đoạn 1: Xây dựng Lõi (Core Engine) & Thuật toán Tạo Map
*Mục tiêu: Đảm bảo nền tảng logic vững chắc, mọi người chơi đều nhận được cùng một kết quả từ một điểm xuất phát (seed).*
* **Trình tạo số ngẫu nhiên giả (PRNG):** Tích hợp thuật toán `mulberry32` hoặc `splitmix32` để đảm bảo tính nhất quán của chuỗi số ngẫu nhiên trên mọi trình duyệt dựa trên một integer seed.
* **Bộ nén & Giải mã dữ liệu (Seed Decoder):** Áp dụng cấu trúc bitwise để nén các thông số quan trọng (NodeCount, Complexity, LevelID) thành một chuỗi Base36 siêu ngắn gọn.
* **Thuật toán đồ thị Euler (Graph Generator):**
  * Xây dựng đồ thị có đường đi Euler: Bắt đầu bằng việc tạo một chu trình chính (Hamiltonian circuit), sau đó thêm các vòng lặp phụ để tăng độ khó.
  * Tích hợp hàm kiểm tra bậc của đỉnh (Degree Check) và Duyệt theo chiều rộng (BFS) để đảm bảo tính liên thông và đồ thị luôn có lời giải trước khi cấp seed cho người chơi.

#### Giai đoạn 2: Phát triển Client-Side (UI/UX) & Tương tác
*Mục tiêu: Đem lại trải nghiệm mượt mà, render đồ họa nhẹ nhàng, không phụ thuộc vào tài nguyên bên ngoài.*
* **Render Engine:** Sử dụng **HTML5 Canvas** thuần thay vì DOM elements để vẽ các đỉnh và cạnh, giúp xử lý hàng trăm đỉnh mà vẫn giữ mức 60 FPS ổn định.
* **Logic Tương tác (Interaction Logic):**
  * Xử lý chính xác các sự kiện chạm/click (touch/click events) để nối các đỉnh.
  * Kiểm tra tính hợp lệ tức thì: Ngay khi thao tác nối A-B diễn ra, client sẽ kiểm tra xem cạnh đó đã được viếng thăm chưa. Nếu hợp lệ, đổi trạng thái sang `visited`; nếu không, từ chối lệnh.
* **Quản lý Trạng thái (State Management):** Cài đặt một cấu trúc `Stack` cơ bản để lưu giữ lịch sử di chuyển (Path Array). Cho phép chức năng **Undo (Hoàn tác)** vô hạn mà không cần tải lại hoặc tính toán lại map.

#### Giai đoạn 3: Hệ thống Multiplayer & Tối ưu Băng thông
*Mục tiêu: Đảm bảo trò chơi hoạt động tốt ngay cả trong môi trường mạng rất yếu (< 5Mbps).*
* **Giao tiếp Mạng Tối giản:** Cấu hình WebSockets (ví dụ: Socket.io) để chỉ phục vụ 3 loại tín hiệu chính:
  1. `JOIN_ROOM`: Chứa ID phòng.
  2. `START_GAME`: Server gửi duy nhất chuỗi `Encoded_Seed` và `Timestamp`.
  3. `SUBMIT_RESULT`: Client báo cáo mảng đường đi `Path[]` (chứa các ID đỉnh) kèm thời gian hoàn thành.
* **Đồng bộ Thời gian (Sync Logic):** Sử dụng `Server Timestamp` làm chuẩn để đồng bộ hóa đồng hồ đếm ngược giữa các Client, giúp loại bỏ độ trễ và chênh lệch do cấu hình máy tính của người chơi.

#### Giai đoạn 4: Bảo mật Server-Side & Chống Gian lận (Anti-Cheat)
*Mục tiêu: Xác thực kết quả từ Client một cách độc lập và lưu trữ dữ liệu Replay tối ưu.*
* **Hệ thống Validator (Node.js):** 
  * Khi nhận `Path[]` từ Client, Server sử dụng lại chuỗi `Seed` để tái tạo cấu trúc đồ thị (chỉ cần danh sách đỉnh/cạnh, không cần mảng tọa độ UI).
  * Server tự động duyệt qua `Path[]` để kiểm tra: Cạnh có tồn tại không? Cạnh có bị lặp lại (đã đi qua) không? Đường đi đã phủ kín toàn bộ đồ thị chưa?
* **Hệ thống Replay Mini:** Lưu trữ chuỗi `Path[]` và chuỗi `Seed` thẳng vào Database. Dữ liệu này chỉ tốn vài chục bytes, cho phép tái hiện lại chính xác toàn bộ ván đấu của bất kỳ người chơi nào.

#### Giai đoạn 5: Kiểm thử, Tối ưu & Đánh bóng (Polishing)
*Mục tiêu: Đảm bảo game chạy hoàn hảo trên mọi thiết bị và điều kiện mạng.*
* **Stress Test với Mạng Yếu:** Bật tính năng Network Throttling trên Chrome DevTools (Fast/Slow 3G, Latency 300-500ms) để test khả năng đồng bộ.
* **Cross-browser Compatibility:** Kiểm thử chéo để đảm bảo hàm cấu trúc đồ thị và hệ máy PRNG (`seededRandom`) diễn dịch ra cùng một map trên cả nhân V8 (Chrome/Edge) và WebKit (Safari/iOS).
* **Chế độ Offline (Luyện tập):** Tự động chuyển đổi sang chế độ chơi đơn với Seed ngẫu nhiên nội bộ khi mất kết nối mạng, đảm bảo không ngắt quãng trải nghiệm của user.

#### Giai đoạn 6: Deploy & Ra mắt
*Mục tiêu: Đưa game lên môi trường sản xuất một cách suôn sẻ và ổn định.*
* **Triển khai Server:** Sử dụng container Proxmox Virtual Environment (PVE) để dễ dàng quản lý và mở rộng tài nguyên khi cần thiết.
* **Yêu cầu tài nguyên Server tối thiểu:** 1 CPU Core, 512MB RAM, 10GB Storage (chủ yếu để lưu trữ replay và logs).
* **Môi trường triển khai Container:** Sử dụng Nginx làm reverse proxy để tối ưu hiệu suất và bảo mật, đồng thời triển khai Node.js server trong container riêng biệt để dễ dàng quản lý và cập nhật. Sử dụng hệ điều hành cơ bản như Ubuntu Server để giảm thiểu overhead và tối ưu hóa hiệu suất.
* **Giám sát & Bảo trì:** Chỉ sử dụng giám sát cơ bản từ PVE để theo dõi hiệu suất server và đảm bảo uptime, tránh các giải pháp phức tạp không cần thiết.
* **Tích hợp tên miền & SSL:** Sử dụng Cloudflare để quản lý DNS và cung cấp chứng chỉ SSL miễn phí, đồng thời sử dụng Nginx Proxy Manager để cấu hình subdomain, đảm bảo kết nối an toàn và ổn định cho người chơi.

---

### 📋 Biểu đồ Ngân sách Kỹ thuật Dự kiến

| Thành phần Logic | Công nghệ Xử lý | Băng thông / Dung lượng Ước tính |
| :--- | :--- | :--- |
| **Dữ liệu Map** | Nén Base36 (vd: `A12F9`) | **~10 bytes** |
| **Kiểm tra (Real-time)** | JavaScript (Client-side) | **0ms Latency** (Không độ trễ) |
| **Xác thực Thắng/Thua** | Node.js (Server-side Validation) | **< 1 KB** (Payload) |
| **Đồ họa Render** | HTML5 Canvas API (Procedural) | **0 KB** (Không phụ thuộc ảnh/assets) |