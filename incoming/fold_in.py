# One-time helper for incoming batches (Oct 22 research).
# Folds every incoming/*.json file into updates.json, keeping the file's existing
# formatting. Afterwards, delete the incoming/ folder. See the PR description.
import json, pathlib

dst = pathlib.Path("updates.json")
raw = dst.read_text(encoding="utf-8")
entries = json.loads(raw)
new = []
for f in sorted(pathlib.Path("incoming").glob("*.json")):
    new += json.loads(f.read_text(encoding="utf-8"))

def norm(t):  # same idea as norm() in index.html
    return " ".join("".join(c if c.isalnum() else " " for c in t.lower()).split())

seen = {norm(x["t"]) for x in entries}
add = []
for x in new:
    if norm(x["t"]) not in seen:
        seen.add(norm(x["t"]))
        add.append(x)

# Keep the batch next to the other Claude research entries if they still lead the file; otherwise append.
at = len(entries)
if entries and str(entries[0].get("by", "")).startswith("Claude research"):
    at = next((i for i, x in enumerate(entries) if not str(x.get("by", "")).startswith("Claude research")), len(entries))
entries[at:at] = add

indent = 2 if raw.startswith("[\n  ") else 1
out = json.dumps(entries, indent=indent, ensure_ascii=False) + ("\n" if raw.endswith("\n") else "")
json.loads(out)
dst.write_text(out, encoding="utf-8")
print(f"{len(entries) - len(add)} + {len(add)} = {len(entries)} entries in updates.json"
      + (f" ({len(new) - len(add)} skipped as duplicates)" if len(add) < len(new) else ""))
