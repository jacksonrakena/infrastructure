#!/usr/bin/env python3
"""Print namespace, kind and name of each object in a rendered manifest on stdin.
Never prints object bodies, so it is safe to use on output containing Secrets."""
import re, sys

counts = {}
for doc in sys.stdin.read().split("\n---"):
    kind = re.search(r"^kind: (\S+)", doc, re.M)
    if not kind:
        continue
    name = re.search(r'^  name: "?([^"\n]+)', doc, re.M)
    ns = re.search(r'^  namespace: "?([^"\n]+)', doc, re.M)
    if kind.group(1) == "CustomResourceDefinition":
        counts["crd"] = counts.get("crd", 0) + 1
        continue
    print(f"{ns.group(1) if ns else '-':12} {kind.group(1):34} {name.group(1) if name else '?'}")
print(f"(+ {counts.get('crd', 0)} CustomResourceDefinitions)")
