# Giải Thích Thuật Toán Trong Game "The Cosmic Weaver"

Bài toán cốt lõi của **The Cosmic Weaver** là **Bài toán vẽ một nét (Đồ thị Euler)**. Dưới đây là chi tiết cách dự án áp dụng các kiến thức logic và thuật toán Toán Rời Rạc vào trong hệ thống Gameplay.

## 1. Thuật toán tạo bản đồ (Graph Generation)

Thay vì chuẩn bị sẵn bộ dữ liệu chứa tọa độ và cạnh các bản đồ, game tự động sinh ra các đồ thị mới dựa trên một số nguyên (Seed) qua bộ tạo PRNG (Pseudo-Random Number Generator) dạng `Mulberry32`. Điều này giúp hệ thống Multiplayer luôn đồng bộ hóa map mà máy chủ không cần truyền siêu bộ nhớ đồ thị khổng lồ.

Quá trình sinh Map (được chạy qua `GraphGenerator.generate()`):

1. **Liên thông cơ bản (Hamiltonian Circuit):** Để đảm bảo đồ thị luôn liên thông, thuật toán đầu tiên tráo đổi ngẫu nhiên các tập đỉnh, sau đó liên kết tất cả chúng lại thành một vòng mạch kín đi qua mọi đỉnh đúng 1 lần. Đảm bảo mọi điểm neo đều kết nối với nhau.
2. **Thêm độ phức tạp (Additional Cycles):** Dựa vào biến `complexity` do người chơi chọn, thuật toán sẽ liên tục chọn ngẫu nhiên các nhóm 3 đỉnh và kết nối chúng thành các chu trình tam giác vòng (Cycles). Ở mỗi đỉnh được chọn vào loại vòng chu trình này, chúng sẽ tăng thêm **+2 bậc**, từ đó giúp đồ thị mới sinh **vẫn hoàn toàn là chu trình Euler (bậc chẵn)**.
3. **Phá vỡ tính Euler (Tạo câu đố thử thách):**
   - Không phải ván nào cũng có map hoàn hảo. Game sẽ tung xác suất để tự động định đoạt loại đồ thị mà người chơi nhận được:
     - **33% cơ hội:** Thuật toán xóa đột ngột 1 cạnh ngẫu nhiên -> Tạo ra đồ thị có đúng 2 đỉnh bậc lẻ -> Đồ thị trở thành **Đường đi Euler**.
     - **33% cơ hội:** Thuật toán xóa 2 cạnh độc lập nhau -> Tạo ra 4 đỉnh bậc lẻ -> **Không phải đồ thị Euler**.
     - **Phần còn lại:** Giữ nguyên mảng rập đã tạo -> **Chu trình Euler hoàn hảo**.
   - **Đảm bảo tính liên thông:** Mỗi lần thuật toán nhắm xóa một cạnh, nó phải sử dụng **BFS (Breadth-First Search)** để kiểm tra tính liên thông yếu (Weakly Connected). Nếu xóa mà gây đứt gãy đồ thị thành 2 mảnh khuyết độc lập, thuật toán tự động phục hồi cạnh đó và thử lại trên cạnh khác.

## 2. Giao thức hỗ trợ (Hierholzer's Algorithm)

Khi người chơi bị kẹt và nhấn "Xem Đáp Án" (Hint), game sử dụng **Thuật toán Hierholzer** kinh điển để tự mình tìm ra và biểu diễn đồ thị Euler:
- **Khởi tạo mốc xuất phát:**
  - Đối với *Đồ thị có hướng (Hard Mode):* Thuật toán sẽ tính toán đỉnh có mức năng lượng thất thoát: `OutDegree - InDegree = 1`.
  - Đối với *Đồ thị vô hướng:* Bắt đầu từ 1 đỉnh lẻ bất kỳ (nếu đỉnh lẻ bằng 2), hoặc chọn một đỉnh bất kỳ luôn (nếu đồ thị 0 đỉnh lẻ).
- Dùng một mảng `Stack` để đi thử. Ngăn xếp duyệt theo DFS tìm liên tục các cạnh cho đến khi gặp ngõ cụt thì bỏ đỉnh đó chèn vào mảng kết quả `Circuit`. Thuật toán vừa chạy vừa làm Backtracking xen kẽ cho đến khi gom toàn bộ chu trình phụ vào con đường chính, rồi đảo ngược lại toàn cảnh.

## 3. Khóa chết đường đi (Kiểm tra Cạnh Cầu - Fleury's Algorithm)

The Cosmic Weaver áp dụng luật trừng phạt lập tức khi người chơi rẽ sai đường, nhằm tăng độ khó và cảnh báo từ sớm:
- Logic sử dụng mô phỏng của **Thuật toán Fleury:** Không bao giờ được đi qua "Cầu" (Cạnh nối duy nhất duy trì đồ thị liên thông) nếu bạn vẫn còn mớ bòng bong phân nhánh cạnh khác.
- Mỗi khi bạn vuốt từ đỉnh `U` sang đỉnh `V`, bộ theo dõi chạy real-time:
  1. Đếm số lượng đỉnh có thể truy lùng tới được bằng BFS từ `U` bằng tập hợp các cạnh *Chưa đi*.
  2. Viết giả lập gỡ cái cạnh `(U, V)` đó ra và BFS đếm lại.
  3. Nếu số đỉnh sau khi giả lập xóa giảm xuống và đồ thị đứt đôi -> Cạnh bạn vừa tự vẽ chính là "Cầu". Lúc này, thuật toán sẽ block đường dẫn của bạn theo đúng điều kiện chặt chẽ của Fleury và báo `"Cảnh báo đứt Cáp Năng lượng! Bạn đã vẽ vào một Giao Điểm Cầu trong khi còn nhánh khác"`.

## 4. Bố cục không gian chống đan chéo giao diện

Vì tọa độ vẽ các nút nếu tự thả tay hên xui vào hình tròn dễ đi xuyên chéo các cạnh đè lên nhau, phương thức `generateLayout` chạy một bài kiểm tra hình học. Nó tính khoảng cách `pointSegmentDistance` từ điểm tới mọi đoạn thẳng hiện diện. Nếu tìm thấy xung đột vi phạm hình học nhỏ hơn `35px`, nó huỷ quá trình random đó và tạo lại vị trí mới để không có tia nào bắn xuyên qua lòng một ngôi sao không lq.
