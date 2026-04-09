# Cẩm Nang Gameplay & Luật Chơi

Game kết hợp việc vận động tư duy tính toán lý thuyết và việc phản xạ vẽ nhanh của người chơi. Tính mạng và tiến trình chơi gắn liền với thời gian thực. Cùng xem qua 3 công đoạn chơi của The Cosmic Weaver.

## Giai đoạn 0: Phân Tích Mạng Lưới (Analysis Phase)
Trong thế giới thực, ngay khi đồ thị xuất hiện, bạn phải dùng lý thuyết của đồ thị Euler để suy nghĩ: Mọi ngôi sao trên màn hình có đáp ứng định lý cơ bản không?
- Bạn có 3 câu trắc nghiệm buộc phải chọn đúng, nếu không sẽ bị trừ cơ hội thi thời gian vàng.
- **Hành động cần làm:** Đếm "Số bậc" (Đường kẻ) chui qua một Ngôi sao.
  - Chu trình Euler: 100% không có đỉnh nào là số chẵn. (Bạn có thể nhắm mắt vẽ bừa, từ đâu cũng về đích).
  - Đường đi Euler: Dò tìm nếu nhận định có đúng **2 ngôi sao chứa bậc lẻ**. Bấm chọn đáp án này. (Lưu ý, lát nữa bạn sẽ chỉ được phép vẽ xuất phát từ cái ngôi sao lẻ đó thì mới chiến thắng được).
  - Không Euler: Nếu bạn đếm bừa ra được 4 hoặc 6 sự đứt đoạn bậc lẻ của cái map lớn.

## Giai đoạn Fixing: Sửa Chữa Đồ Thị
Giai đoạn này sẽ khóa màn hình bạn lại nếu bạn rơi vào trường hợp "Không phải Euler", yêu cầu bạn dùng quyền người chơi để "Tái tạo" map thành Euler.
- Game cấp quyền "Giao Thức Liên Kết". Số lượng cho phép bằng `(Số đỉnh lẻ chia đôi) - 1`.
- Nhiệm vụ của bạn là: Chọn bù 2 đỉnh vào nhau để tự thêm đường kẻ cho chúng thành đỉnh CHẴN. (Hoặc chọn 2 đỉnh đã sát nhau từ đầu để HỦY liên kết của chúng).
- Miễn sao bạn biến vạn vật về thành quy luật hoàn hảo (chỉ còn dưới 2 cái rác lẻ trên map). Chấp nhận sửa xong, bạn được quyền vượt mức qua Phân đoạn chạy tốc độ.

## Giai đoạn Drawing: Kéo Năng Lượng
Sau khi hệ thống cho lưu thông:
- Bạn nhấn giữ 1 Ngôi Sao (đỉnh) và lôi rê chuột sang một Ngôi sao liền kề với nhau.
- Các Nét năng lượng sáng đèn sẽ đổi sang màu vạch tối sau khi đi qua (Mỗi đường chỉ vẽ 1 lần duy nhất).
- **Tránh Rủi Ro Cầu Nối:** Đừng bao giờ dại khoét ngang 1 Cạnh Cầu chia cách 2 khu đảo của Đồ thị ra. Nó sẽ cảnh báo Đứt Cáp bởi vì khi bạn vuốt sang đảo bên này mòn hết viền nét, thì bạn sẽ kẹt lại đảo này và không có đường đi về nơi xuất phát, thua cuộc ngay lập tức. Tính năng sẽ khóa không cho bạn đi qua đường đó và Block bạn.
- Bế tắc và đứt Cáp 3 Lần trong map bạn Tự Sửa? -> Thuật toán sẽ hỏi bạn muốn xóa toàn bộ nét tự kết nối để suy nghĩ làm lại 1 cách chỉn chu hay không.

Chúc bạn may mắn với công cuộc thắp sáng vũ trụ.
