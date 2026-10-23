# One-time helper for the New England batch (Oct 22 research).
# Folds incoming/new-england-2025.json into updates.json, keeping the file's
# existing formatting, then you delete the incoming/ folder. See the PR description.
import json, pathlib

src = pathlib.Path("incoming/new-england-2025.json")
dst = pathlib.Path("updates.json")
raw = dst.read_text(encoding="utf-8")
entries = json.loads(raw)
new = json.loads(src.read_text(encoding="utf-8"))

def norm(t):  # same idea as norm() in index.html
    return " ".join("".join(c if c.isalnum() else " " for c in t.lower()).split())

seen = {norm(x["t"]) for x in entries}
add = [x for x in new if norm(x["t"]) not in seen]

# Keep New England next to the rest of the Northeast batch if it's still there; otherwise append.
at = next((i + 1 for i, x in enumerate(entries) if "2021 data center tax incentive" in x["t"]), len(entries))
entries[at:at] = add

indent = 2 if raw.startswith("[\n  ") else 1
out = json.dumps(entries, indent=indent, ensure_ascii=False) + ("\n" if raw.endswith("\n") else "")
json.loads(out)
dst.write_text(out, encoding="utf-8")
print(f"{len(entries) - len(add)} + {len(add)} = {len(entries)} entries in updates.json"
      + (f" ({len(new) - len(add)} skipped as duplicates)" if len(add) < len(new) else ""))
