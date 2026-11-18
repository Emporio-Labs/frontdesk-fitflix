with open(r"c:\Users\Yeshwanth\Yugaas\github_clones\frontdesk-fitflix\app\admin\memberships\page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()
for i, l in enumerate(lines):
    if 'pause' in l.lower():
        print(f"L{i+1}: {l.strip()}")
        for j in range(max(0, i-4), min(len(lines), i+6)):
            print(f"  {j+1}: {lines[j].strip()}")
        print("---")
