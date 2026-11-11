#!/usr/bin/env python3
"""Chấm điểm REACH cho danh sách đối thủ từ file CSV và chọn top N.

Cách dùng:
  python3 reach_score.py docs/website/02-doi-thu.csv --top 5
  python3 reach_score.py doi-thu.csv --weights fb_followers=0.3,google_top10=0.25,...

Cột bắt buộc: name. Cột số (tuỳ chọn, ô trống = chưa có dữ liệu, không bị phạt):
  fb_followers, tiktok_followers, youtube_subs, web_visits, google_top10, maps_reviews
Cột same_target (1/0): chỉ dòng = 1 mới được xếp hạng; dòng = 0 in riêng để người dùng thấy lý do loại.

Cách tính: mỗi cột lấy log10(x+1) rồi quy về 0–100 theo tỉ lệ so với đối thủ cao nhất trong nhóm
(riêng google_top10 tính tuyến tính vì số nhỏ); 0 = không có, 100 = cao nhất nhóm. REACH = tổng(điểm cột × trọng số) / tổng trọng số của các cột có dữ liệu.
Chỉ dùng thư viện chuẩn.
"""
import argparse, csv, math, sys

METRICS = ["fb_followers", "tiktok_followers", "youtube_subs", "web_visits", "google_top10", "maps_reviews"]
DEFAULT_W = {"fb_followers": 0.30, "google_top10": 0.25, "maps_reviews": 0.15,
             "web_visits": 0.15, "tiktok_followers": 0.10, "youtube_subs": 0.05}
LINEAR = {"google_top10"}


def to_num(v):
    v = (v or "").strip().replace(".", "").replace(",", "").lower()
    if v in ("", "n/a", "na", "-", "?"):
        return None
    mult = 1
    if v.endswith("k"): mult, v = 1_000, v[:-1]
    elif v.endswith("m") or v.endswith("tr"): mult, v = 1_000_000, v.rstrip("mtr")
    try:
        return float(v) * mult
    except ValueError:
        return None


def parse_weights(s):
    w = dict(DEFAULT_W)
    if s:
        for part in s.split(","):
            k, v = part.split("=")
            if k.strip() not in METRICS:
                sys.exit(f"Trọng số không hợp lệ: {k}")
            w[k.strip()] = float(v)
    return w


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--weights", default="")
    a = ap.parse_args()
    w = parse_weights(a.weights)

    with open(a.csv, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows or "name" not in rows[0]:
        sys.exit("CSV cần cột 'name'")

    pool = [r for r in rows if (r.get("same_target") or "1").strip() != "0"]
    excluded = [r for r in rows if r not in pool]

    # chuẩn hoá từng cột trong nhóm pool
    norm = {}
    for m in METRICS:
        vals = {r["name"]: to_num(r.get(m)) for r in pool}
        present = {k: v for k, v in vals.items() if v is not None}
        if not present:
            continue
        tf = (lambda x: x) if m in LINEAR else (lambda x: math.log10(x + 1))
        t = {k: tf(v) for k, v in present.items()}
        hi = max(t.values())
        # tỉ lệ so với đối thủ cao nhất: 100 = cao nhất nhóm, 0 = không có gì
        norm[m] = {k: (v / hi * 100 if hi > 0 else 0.0) for k, v in t.items()}

    scored = []
    for r in pool:
        num = den = 0.0
        parts = {}
        for m in METRICS:
            if m in norm and r["name"] in norm[m]:
                num += norm[m][r["name"]] * w[m]
                den += w[m]
                parts[m] = norm[m][r["name"]]
        reach = num / den if den else 0.0
        scored.append((reach, r, parts, den))
    scored.sort(key=lambda x: -x[0])

    cols = [m for m in METRICS if m in norm]
    head = f"{'#':>2} {'REACH':>6} {'Tên':<28} " + " ".join(f"{c[:9]:>9}" for c in cols) + "  dữ liệu"
    print(head); print("-" * len(head))
    for i, (reach, r, parts, den) in enumerate(scored, 1):
        cells = " ".join(f"{parts[c]:>9.0f}" if c in parts else f"{'-':>9}" for c in cols)
        cover = f"{den / sum(w[c] for c in cols) * 100:.0f}%" if cols else "0%"
        print(f"{i:>2} {reach:>6.1f} {r['name'][:28]:<28} {cells}  {cover}")
    print()
    print(f"=> Đề xuất chọn top {a.top}: " + ", ".join(r['name'] for _, r, _, _ in scored[:a.top]))
    if len(scored) > a.top and scored[a.top - 1][0] - scored[a.top][0] < 5:
        print(f"   (hạng {a.top} và {a.top + 1} cách nhau < 5 điểm: cân nhắc lấy cả hai)")
    low = [r['name'] for _, r, _, den in scored if den < 0.5 * sum(w.values())]
    if low:
        print("   Thiếu > 50% dữ liệu, xếp hạng chưa tin cậy: " + ", ".join(low))
    if excluded:
        print("\nLoại vì khác khách hàng mục tiêu (same_target=0): " +
              "; ".join(f"{r['name']} ({r.get('note', '').strip() or 'không ghi lý do'})" for r in excluded))


if __name__ == "__main__":
    main()
