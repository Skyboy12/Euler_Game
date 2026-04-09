# Hệ Thống Multiplayer & Anti-Cheat (Xác Thực Bảo Mật)

Bên cạnh giá trị giải đố đồ thị, The Cosmic Weaver nổi bật vì tính năng thi đấu tốc độ thông qua Socket.IO. Backend Node.js của game được thiết kế nhẹ tựa lông hồng nhưng rất hoàn thiện về chống gian lận.

## 1. Đồng bộ hóa dạng Hạt giống (Seed Deterministic Synchronization)

Các trò chơi Multiplayer truyền thống thường yêu cầu Server sinh Map rối tung ra JSON, rồi băm gói tin gửi hàng ngàn Bytes cấu hình map tới 10 người chơi trong phòng. Chúng tôi không làm vậy. The Cosmic Weaver dùng cơ chế giải đố tiền định.

- Dù map có bao nhiêu cạnh, thông tin mà Server gửi đến cho người chơi trong Room chỉ là một chuỗi siêu ngắn dạng Base36. Ví dụ: `7H3K9-H`.
- Chuỗi kết hợp này chứa: `<Thông số ngẫu nhiên cấp rễ> + <NodeCount> + <Complexity> + <Loại game>`.
- Ngay khi nhận mã Token Base36 này, 10 Client khác nhau sẽ tự xài thư viện PRNG ngẫu nhiên giả (Nhưng lại là chẵn lẻ 1-1, đồng nhất do sử dụng hàm `mulberry32` chung Seed). Tất cả cùng lúc tạo ra map với số đỉnh, mạng lưới, vị trí không lệch 1 ly.
- **Lợi ích:** Server phục vụ hàng vạn Room mượt mà với 0% RAM lưu biến đồ thị thực.

## 2. Validator tại Server (Anti-Cheat)

Vấn đề Multiplayer trên nền Web là Client dễ dàng dùng Script F12 ăn gian lệnh kết thúc gửi về Server (Báo cáo `"Tôi vừa vẽ đúng trong 0.1s"`).

Tuyệt đối không! Server vận hành cơ chế **Server-side Path Validation**, thực thi theo quy trình lúc xác định bài thi:
1. Client gửi lên mảng thông tin các ID Đỉnh đã vuốt theo một chuỗi mảng Array nguyên thủy `pathStack` (VD: `[0, 3, 2, 6]`).
2. Server Node.js nhớ mã Seed đã phát cho Room của người chơi lúc bắt đầu thi, Server tái hiện ngầm đồ thị đó trên không gian ảo của Backend (không sinh giao diện đồ họa).
3. Server phân tích quy luật Euler trên Backend. Đếm tổng thể số tia năng lượng của đồ thị và thẩm định chiều dải đường thẳng trong `pathStack`. Nếu không đủ cạnh của bản đồ -> Từ chối khéo `Đường đi không đủ mảng ghép mạng`.
4. Nếu số cạnh đầy đủ, Backend chạy qua `pathStack` duyệt qua từ cạnh này tới cạnh khác, so sánh với mảng Adj List vừa tạo từ Seed. Nếu đúng là Cạnh đó có liên kết và Client chưa vuốt lại 2 lần -> Báo kết quả Trả về Thắng Cuộc cho Room. Hệ thống sẽ bỏ qua ngẫu nhiên kết quả sai và báo tận mặt Client gian lận dòng Log: `"Hệ thống báo cáo Gian lận từ bạn..."`.

## Trọng số Backend
Server (`server/index.js`) vận hành dưới mô hình Event-driven và hoàn toàn Stateless khi tạo Graph logic, chỉ lưu Room cơ bản, tự đóng Room chặn rác memory leak, giúp duy trì game luôn hoạt động theo hình thức Lightweight MMO Logic.
