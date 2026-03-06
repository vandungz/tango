# Tango Puzzle Algorithm & Design Spec

> Nguồn tổng hợp từ 4 tài liệu bạn cung cấp (Feb 2026), dùng làm chuẩn hiểu game và chuẩn triển khai generator/solver trong dự án.

## 1) Mục tiêu thiết kế

Tango là puzzle nhị phân (Sun/Moon) với yêu cầu:
- Mỗi puzzle có **nghiệm duy nhất**.
- Có thể giải bằng **logic thuần túy** (không bắt buộc đoán mò).
- Độ khó phản ánh **loại quy tắc suy luận** cần dùng, không chỉ phụ thuộc kích thước board.

## 2) Luật chơi cốt lõi

Mọi kích thước board (4×4, 6×6, 8×8, 10×10) đều dùng 4 luật:

1. **Balance rule**: mỗi hàng/cột có đúng một nửa Sun và một nửa Moon.
2. **No triple rule**: không có 3 ký hiệu giống nhau liên tiếp theo hàng/cột.
3. **`=` clue**: hai ô kề nhau phải **giống nhau**.
4. **`×` clue**: hai ô kề nhau phải **khác nhau**.

## 3) Số liệu theo kích thước board

| Size | Cells | Symbols per line | Base row patterns | Typical solve time |
|---|---:|---:|---:|---|
| 4×4 | 16 | 2 + 2 | 3 | 30–90 sec |
| 6×6 | 36 | 3 + 3 | 5 | 2–5 min |
| 8×8 | 64 | 4 + 4 | 12 | 4–10 min |
| 10×10 | 100 | 5 + 5 | 25 | 8–20 min |

**Base row patterns** = số mẫu hàng hợp lệ “gốc” trước khi tính đối xứng gương (reflection) và đảo màu (inversion).

## 4) Taxonomy quy tắc suy luận (solver rules)

Thứ tự từ dễ đến khó (kèm trọng số difficulty theo tài liệu):

1. **Clue Propagation** (1)
   - Một phía của `=` hoặc `×` đã biết thì phía còn lại suy ra ngay.

2. **Almost Full** (1)
   - Hàng/cột đã đủ quota một biểu tượng thì ô trống còn lại là biểu tượng đối lập.

3. **Triple Prevention** (1)
   - Mẫu `A A _` hoặc `_ A A` buộc ô trống là `not A`.

4. **Gap Fill / Sandwich** (2)
   - Mẫu `A _ A` buộc ô giữa là `not A`.

5. **Touching Pair** (4)
   - Cặp `= ` còn trống (`? = ?`) nhưng có ô điền ngay cạnh đầu/cạnh cuối cặp thì cả cặp bị ép theo luật chống triple.

6. **Edge Pair / Big Gap** (6)
   - Quy tắc biên mạnh ở board nhỏ-vừa (đặc biệt 6×6, mở rộng biến thể cho 8×8).

7. **Equal-Gap** (7)
   - Mẫu `? = ?` ở mép + thông tin đầu kia của line có thể ép cặp `=` (đặc biệt hữu dụng ở 6×6).

8. **Opposite Inference** (9)
   - Với cặp `×` chưa điền + line gần full, quota còn lại ép các ô khác.

9. **Inverse Big Gap** (9)
   - Biến thể edge pattern hiếm hơn.

10. **Constraint Enumeration** (10)
   - Liệt kê tổ hợp hợp lệ cho nhóm clue chồng chéo; ô nào bất biến qua mọi tổ hợp hợp lệ thì được xác định.

## 5) Chiến lược giải thực chiến (player-facing)

Từ 3 tài liệu chiến lược:
- Luôn quét clue `=` và `×` trước.
- Count trước khi đặt.
- Tìm adjacent pair, sandwich (`A _ A`).
- Ưu tiên chain clue (nhiều clue liền nhau).
- Luân phiên scan theo row và column.
- Khi bí, dùng contradiction (`what-if`) có kiểm chứng.
- Ưu tiên line dễ (ít ô trống nhất) và lặp nhiều pass.

## 6) Bản đồ kỹ thuật theo kích thước

### 4×4 (warm-up)
- Space nghiệm nhỏ, cascade nhanh.
- Chủ yếu: clue propagation + count.
- Hiếm khi cần rule nâng cao.

### 6×6 (sweet spot)
- Kích thước tiêu chuẩn, chuỗi suy luận rõ.
- Triple + Gap/Sandwich là bắt buộc ở mức medium.
- Edge pattern và Equal-Gap thường xuất hiện ở hard.

### 8×8 (challenge)
- Độ mơ hồ tăng mạnh (12 base patterns).
- Rule count “kích hoạt muộn” hơn so với 6×6.
- Cần chain clue + nhận diện pattern biên (BigGap 8×8) + opposite inference.

### 10×10 (expert)
- Quy tắc biên kiểu nhỏ không còn ép mạnh như 6×6.
- Nặng về scan có hệ thống, chain clue, count nhiều vòng.
- Có thể cần constraint enumeration ở very hard.

## 7) Pipeline sinh puzzle chuẩn (4 bước)

## Step 1 — Build Complete Solution

Sinh board đã giải hoàn chỉnh trước:
1. Lấy tập valid row pattern cho size:
   - Đủ balance.
   - Không có triple.
2. Dùng base patterns + biến thể (reflection + inversion).
3. Đặt từng row theo backtracking:
   - Không overflow count theo cột.
   - Không tạo triple ở cột.
   - Không trùng row/col hoàn chỉnh (nếu game yêu cầu uniqueness line).
4. Kết quả là **answer key**.

## Step 2 — Place `=` / `×` Clues

- Lấy các cặp ô kề nhau (h/v).
- Chọn ngẫu nhiên theo mật độ clue mong muốn theo size.
- Nếu 2 ô trong solution giống nhau -> `=`; khác nhau -> `×`.
- Clue luôn trung thực vì dựa trên solution đã biết.

## Step 3 — Unsolve (remove cells)

Mục tiêu: blank tối đa nhưng vẫn logic-solvable + unique.

Quy trình:
1. Chọn một ô đã điền.
2. Tạm xóa.
3. Chạy solver rule-based + kiểm tra unique solution.
4. Nếu vẫn suy ra đúng solution duy nhất -> giữ ô trống.
5. Nếu không -> phục hồi ô.
6. Lặp đến khi không xóa thêm được.

## Step 4 — Score Difficulty

- Chạy solver lần cuối từ trạng thái puzzle.
- Ghi lại:
  - danh sách bước,
  - rule đã dùng,
  - max difficulty rule,
  - tổng điểm difficulty.
- Gán nhãn:
  - Easy: chỉ rule cơ bản.
  - Medium: cần rule trung cấp (triple/gap/touching/chains).
  - Hard: cần edge/equal-gap/opposite.
  - Very Hard: có constraint enumeration.

## 8) Tính công bằng của puzzle

Puzzle được coi là “fair” khi đồng thời thỏa:
- Có nghiệm.
- Nghiệm duy nhất.
- Có thể đi từ state ban đầu tới nghiệm bằng tập rule logic được engine công bố.

Không cần đoán mù; nếu dùng contradiction thì đó là kỹ thuật logic có kiểm chứng.

## 9) Đề xuất dữ liệu cần lưu cho mỗi puzzle

Metadata nên lưu để audit/chấm difficulty tốt hơn:
- `size`, `hash`, `board`, `solution`, `clues`
- `difficulty` (tổng điểm)
- `maxRuleDifficulty` (độ sâu rule cao nhất)
- `rulesUsed` (JSON mảng rule)
- `clueCount`, `givensCount`
- `baseRowPatternCount`
- `generationVersion`, `solverVersion`
- `label`

## 10) Pseudocode tham chiếu

```text
function generatePuzzle(size):
  solution = generateCompleteSolution(size)
  clues = placeCluesFromSolution(solution, size)
  puzzleBoard = unsolveMax(solution, clues, size)

  solveReport = solveRuleBased(puzzleBoard, clues, size)
  assert solveReport.solved
  assert solveReport.solution == solution
  assert countSolutions(puzzleBoard, clues) == 1

  difficulty = solveReport.totalDifficulty
  label = mapDifficulty(difficulty, solveReport.maxRuleDifficulty)

  return {
    board: puzzleBoard,
    solution,
    clues,
    difficulty,
    maxRuleDifficulty: solveReport.maxRuleDifficulty,
    rulesUsed: solveReport.rulesUsed,
    label
  }
```

## 11) Hướng dẫn dùng spec này trong dự án

- Dùng tài liệu này làm chuẩn review khi sửa `generator`, `clue-placer`, `unsolver`, `solver`.
- Bất kỳ rule mới nào phải được:
  1) mô tả rõ pattern,
  2) gán difficulty,
  3) test với ví dụ dương/âm,
  4) cập nhật difficulty mapping.
- Khi tuning độ khó, ưu tiên chỉnh:
  - mật độ clue theo size,
  - chiến lược unsolve,
  - ngưỡng gán nhãn theo `maxRuleDifficulty` + tổng điểm.

## 12) Tiêu chuẩn mode: Daily và Journey

### 12.1 Daily mode (một puzzle mỗi ngày)

Mục tiêu sản phẩm:
- Tạo trải nghiệm quay lại hằng ngày, có streak và so sánh thời gian.
- Cùng ngày + cùng biến thể phải trả về cùng puzzle cho mọi người chơi.

Tiêu chuẩn kỹ thuật:
- Key định danh puzzle theo ngày: `(date UTC, size, proMode)`.
- `date` phải chuẩn hóa về **startOfDay UTC** để tránh lệch múi giờ.
- Mỗi key Daily chỉ trỏ tới đúng một `puzzleId`.
- Puzzle Daily vẫn phải thỏa chuẩn fairness chung: solved-by-logic + unique solution.

Tiêu chuẩn gameplay:
- Hỗ trợ đủ 4 size: `4, 6, 8, 10`.
- `proMode` là biến thể cùng ngày, ưu tiên puzzle có difficulty cao hơn trong số nhiều lần generate nội bộ.
- Kết quả hoàn thành lưu theo identity (`userId` hoặc `sessionId`):
   - thời gian hoàn thành,
   - stars,
   - completedAt.

Tiêu chuẩn progression:
- Streak tính theo ngày UTC liên tiếp.
- `currentStreak`: số ngày liên tiếp tính lùi từ hôm nay.
- `bestStreak`: streak dài nhất lịch sử.
- Trường hợp người chơi làm nhiều size trong cùng ngày:
   - lưu tiến độ theo từng biến thể,
   - khi hiển thị tổng quan dùng kết quả tốt nhất theo tiêu chí stars cao hơn, nếu bằng thì thời gian thấp hơn.

### 12.2 Journey mode (chuỗi level có độ khó tăng dần)

Mục tiêu sản phẩm:
- Tạo đường học logic từ dễ đến khó, giúp người chơi internalize từng rule.
- Cung cấp lộ trình dài hạn thay vì vòng lặp theo ngày.

Tiêu chuẩn nội dung:
- Có tập level hữu hạn (theo tài liệu: >200 level curated).
- Mỗi level gắn với một puzzle cố định (`level order -> puzzleId`).
- Thứ tự level phải phản ánh learning curve:
   1) rule cơ bản,
   2) rule trung cấp,
   3) edge/inference,
   4) enumeration ở nhóm cuối.

Tiêu chuẩn triển khai:
- Level có thể được tạo từ cùng generator pipeline, nhưng cần thêm bước **curation/validation** trước khi publish.
- Không để hai level liên tiếp có profile suy luận quá giống nhau (đa dạng rule mix).
- Nên lưu metadata để kiểm soát progression quality:
   - `rulesUsed`, `maxRuleDifficulty`, `difficulty`, `size`, `clueCount`, `givensCount`.

Tiêu chuẩn lưu tiến độ:
- Mỗi identity có tối đa một kết quả tốt nhất cho mỗi level.
- `bestTime = min(timeSeconds)` hợp lệ.
- `bestStars = max(stars)` theo các lần clear.
- `nextLevel` là level nhỏ nhất chưa hoàn thành.

### 12.3 Khác biệt chuẩn giữa Daily và Journey

| Khía cạnh | Daily | Journey |
|---|---|---|
| Nguồn puzzle | Tạo theo ngày (deterministic theo key) | Danh sách level curated/fixed |
| Mục tiêu | Retention ngắn hạn, streak | Học kỹ năng dài hạn, mastery |
| Reset nội dung | Mỗi ngày | Không reset, tiến tuyến tính |
| Tracking chính | streak, best daily time | stars/timing theo từng level |
| Yêu cầu cân bằng | Công bằng theo ngày cho mọi người | Độ khó tăng dần, tránh nhảy bậc quá gắt |

---

**Version**: 1.1  
**Updated**: 2026-03-06  
**Scope**: Tổng hợp cách hiểu gameplay + generation/solver algorithm từ 4 tài liệu đã cung cấp.
