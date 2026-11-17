#!/usr/bin/env python3
"""Diff a rendered release (stdin) against the cluster with server-side apply.

    helmfile template ... | scripts/kube-diff.py <release-namespace> <release-name>

Objects are grouped by namespace: an explicit metadata.namespace wins, anything
else goes to the release namespace (as Helm would install it). Each object gets
the ownership metadata Helm adds when it applies a release (which `helm
template` output lacks), then each group is passed to `kubectl diff
--server-side` as Helm's field manager. A group whose namespace doesn't exist
yet is reported as all-new instead of failing.

Exit status follows kubectl diff: 0 no changes, 1 changes, 2+ error.
The manifest stays in memory; it may contain decrypted Secrets.
"""
import json, re, subprocess, sys

sys.excepthook = lambda t, e, tb: (sys.__excepthook__(t, e, tb), sys.exit(2))

release_ns, release = sys.argv[1], sys.argv[2]

groups = {}
for doc in sys.stdin.read().split("\n---"):
    if not re.search(r"^kind: ", doc, re.M):
        continue
    m = re.search(r'^  namespace: "?([^"\n]+)"?\s*$', doc, re.M)
    groups.setdefault(m.group(1) if m else release_ns, []).append(doc)


def to_objects(docs, ns):
    """YAML documents -> list of dicts, via a client-side kubectl dry run."""
    out = subprocess.run(
        ["kubectl", "create", "--dry-run=client", "--validate=false", "-o", "json", "-n", ns, "-f", "-"],
        input="\n---".join(docs), text=True, capture_output=True)
    if out.returncode != 0:
        sys.stderr.write(out.stderr)
        sys.exit(2)
    decoder, text, i, objs = json.JSONDecoder(), out.stdout, 0, []
    while True:
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text):
            return objs
        obj, i = decoder.raw_decode(text, i)
        objs.extend(obj["items"] if obj.get("kind") == "List" else [obj])


status = 0
for ns, docs in sorted(groups.items()):
    exists = subprocess.run(["kubectl", "get", "namespace", ns],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not exists:
        print(f"  namespace {ns} doesn't exist yet: {len(docs)} object(s) would be created")
        status = max(status, 1)
        continue
    objs = to_objects(docs, ns)
    for o in objs:
        meta = o.setdefault("metadata", {})
        # `or {}`: charts can render `labels:`/`annotations:` with no entries (null).
        meta["labels"] = meta.get("labels") or {}
        meta["labels"]["app.kubernetes.io/managed-by"] = "Helm"
        meta["annotations"] = meta.get("annotations") or {}
        meta["annotations"].update({
            "meta.helm.sh/release-name": release,
            "meta.helm.sh/release-namespace": release_ns,
        })
    rc = subprocess.run(
        ["kubectl", "diff", "--server-side", "--force-conflicts", "--field-manager=helm",
         "-n", ns, "-f", "-"],
        input=json.dumps({"apiVersion": "v1", "kind": "List", "items": objs}), text=True).returncode
    status = max(status, rc)
sys.exit(status)
