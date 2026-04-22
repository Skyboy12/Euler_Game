#include <iostream>
#include <vector>
#include <stack>
#include <algorithm>

using namespace std;

/**
 * THUẬT TOÁN TÌM CHU TRÌNH/ĐƯỜNG ĐI EULER (Nâng cao)
 * Hỗ trợ cả Đồ thị Vô hướng (Normal) và Có hướng (Hard Mode)
 */

void findEuler(int n, vector<vector<int>> adj, int startNode, bool isDirected) {
    stack<int> st;
    vector<int> CE;
    
    st.push(startNode);
    
    while (!st.empty()) {
        int s = st.top();
        int t = -1;
        
        // Tìm đỉnh kề t đầu tiên của s
        for (int i = 0; i < n; i++) {
            if (adj[s][i] > 0) {
                t = i;
                break;
            }
        }
        
        if (t != -1) {
            st.push(t);
            // Loại bỏ cạnh (s, t)
            adj[s][t]--;
            if (!isDirected) {
                adj[t][s]--; // Nếu vô hướng thì xóa cả chiều ngược lại
            }
        } else {
            // Nếu s không còn đỉnh kề, đưa s vào danh sách kết quả CE
            CE.push_back(st.top());
            st.pop();
        }
    }
    
    // Đảo ngược CE để có kết quả cuối cùng
    reverse(CE.begin(), CE.end());
    
    cout << "\nKet qua (Chu trinh/Duong di Euler):" << endl;
    for (size_t i = 0; i < CE.size(); i++) {
        cout << CE[i] << (i == CE.size() - 1 ? "" : " -> ");
    }
    cout << endl;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    vector<vector<int>> adj(n, vector<int>(n));
    vector<int> inDegree(n, 0), outDegree(n, 0);
    bool isDirected = false;

    // Đọc ma trận và tính bậc
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            cin >> adj[i][j];
            if (adj[i][j]) {
                outDegree[i]++;
                inDegree[j]++;
            }
        }
    }

    // Tự động phát hiện đồ thị có hướng
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (adj[i][j] != adj[j][i]) {
                isDirected = true;
                break;
            }
        }
        if (isDirected) break;
    }

    // Xác định Start Node
    int startNode = 0;
    if (isDirected) {
        // Đồ thị có hướng: tìm đỉnh có out - in = 1
        for (int i = 0; i < n; i++) {
            if (outDegree[i] - inDegree[i] == 1) {
                startNode = i;
                break;
            }
        }
    } else {
        // Đồ thị vô hướng: tìm đỉnh có bậc lẻ
        for (int i = 0; i < n; i++) {
            if (outDegree[i] % 2 != 0) {
                startNode = i;
                break;
            }
        }
    }

    findEuler(n, adj, startNode, isDirected);
    
    return 0;
}
