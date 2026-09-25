#!/usr/bin/env python3
"""Package, publish and verify one version. No credentials are written to the repo."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
API = "https://appstore-api.repebble.com"
APP_ID = "6d7f75de20c3406198a5abd6"
APP_UUID = "9c30165f-5852-4e13-8806-9809ab3d4fe3"
STORE = "https://apps.repebble.com/" + APP_ID


def version_for(tag=None):
    versions = [json.loads((ROOT / path).read_text())["version"] for path in
                ["package.json", "watchface/package.json", "package-lock.json"]]
    if len(set(versions)) != 1 or not re.fullmatch(r"\d+\.\d+\.\d+", versions[0]):
        raise ValueError("Root, watch and lockfile versions must match (major.minor.patch).")
    version = versions[0]
    if tag and tag != "v" + version:
        raise ValueError("Release tag must match the package version: v" + version)
    return version


def validate_pbw(path, version):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip():
            raise ValueError("PBW archive is corrupt.")
        info = json.loads(archive.read("appinfo.json"))
        if info.get("uuid", "").lower() != APP_UUID or info.get("versionLabel") != version:
            raise ValueError("PBW UUID/version does not match this release.")
        if info.get("targetPlatforms") != ["emery"] or not info.get("watchapp", {}).get("watchface"):
            raise ValueError("This release must be an Emery-only watchface.")
        for name in ["pebble-js-app.js", "emery/pebble-app.bin", "emery/app_resources.pbpack", "emery/manifest.json"]:
            if name not in archive.namelist():
                raise ValueError("PBW is missing " + name)
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def package(version):
    source = ROOT / "watchface/build/watchface.pbw"
    validate_pbw(source, version)
    out = ROOT / "release-artifacts"
    out.mkdir(exist_ok=True)
    # A PBW is a ZIP archive. Deflate changes only its transport size; every
    # member, including source maps and the SDK manifest, stays byte-identical.
    with zipfile.ZipFile(source) as src, zipfile.ZipFile(out / "dymaxion.pbw", "w", zipfile.ZIP_DEFLATED) as dest:
        for item in src.infolist():
            dest.writestr(item.filename, src.read(item.filename))
    digest = validate_pbw(out / "dymaxion.pbw", version)
    with zipfile.ZipFile(source) as src, zipfile.ZipFile(out / "dymaxion.pbw") as dest:
        assert src.namelist() == dest.namelist()
        assert all(src.read(name) == dest.read(name) for name in src.namelist())
    notes = ROOT / "releases" / ("v" + version + ".md")
    if not notes.is_file():
        raise ValueError("Add release notes at " + str(notes.relative_to(ROOT)))
    shutil.copyfile(notes, out / "release-notes.md")
    (out / "SHA256SUMS").write_text(digest + "  dymaxion.pbw\n")
    print(f"Packaged Dymaxion {version}: {(out / 'dymaxion.pbw').stat().st_size:,} bytes; all SDK contents preserved.")
    return out / "dymaxion.pbw"


def description():
    copy = (ROOT / "docs/STORE-LISTING.md").read_text().split("## Description\n", 1)[1].split("\n## ", 1)[0].strip()
    if not copy or len(copy) > 1600:
        raise ValueError("Store description must contain 1–1600 characters.")
    return copy


def access_token():
    from pebble_tool.account import get_account
    from pebble_tool.firebase_account import DEFAULT_FIREBASE_API_KEY
    import requests
    refresh = os.environ.get("PEBBLE_FIREBASE_REFRESH_TOKEN")
    if refresh:
        r = requests.post("https://securetoken.googleapis.com/v1/token",
                          params={"key": DEFAULT_FIREBASE_API_KEY},
                          data={"grant_type": "refresh_token", "refresh_token": refresh}, timeout=30)
        if not r.ok:
            raise RuntimeError("Pebble release sign-in could not be refreshed. Reconnect the publishing secret.")
        token = r.json()["id_token"]
    else:
        if os.environ.get("GITHUB_ACTIONS"):
            raise RuntimeError("Set the repository secret PEBBLE_FIREBASE_REFRESH_TOKEN before publishing.")
        account = get_account(auth_provider="firebase")
        if not account.is_logged_in:
            raise RuntimeError("Run pebble login before publishing.")
        token = account.get_access_token()
    if os.environ.get("GITHUB_ACTIONS"):
        print("::add-mask::" + token)
    return token


def public_app():
    import requests
    # The public endpoint caches responses for five minutes and serves stale
    # ones while revalidating. A unique query reads the release just uploaded,
    # and the listing text just edited, without retrying a successful upload.
    response = requests.get(API + "/api/v1/apps/id/" + APP_ID,
                            params={"_release_check": str(time.time_ns())}, timeout=30)
    response.raise_for_status()
    return response.json()["data"][0]


def publish(pbw, version):
    import requests
    from pebble_tool.commands.publish import PublishCommand
    digest = validate_pbw(pbw, version)
    copy = description()
    notes = (ROOT / "releases" / ("v" + version + ".md")).read_text().strip()
    token = access_token()
    headers = {"Authorization": "Bearer " + token}
    r = requests.get(API + "/api/v1/developer/me", headers=headers, timeout=30)
    r.raise_for_status()
    me = r.json()
    if me.get("app_lookup", {}).get("by_app_uuid", {}).get(APP_UUID) != APP_ID:
        raise RuntimeError("This account does not own the expected Dymaxion listing. No changes made.")
    limit = me.get("upload_constraints", {}).get("max_pbw_bytes", 4400000)
    if Path(pbw).stat().st_size > limit:
        raise ValueError("PBW exceeds the store upload limit.")

    app = public_app()
    current = app.get("latest_release", {}).get("version", "0.0.0")
    parse = lambda v: tuple(int(n) for n in v.split("."))
    if parse(current) > parse(version):
        raise ValueError("Refusing to replace a newer published version.")
    if current != version:
        PublishCommand._upload_release(API, APP_ID, token, str(pbw), version, notes, True, [], [])
    # A rerun verifies an existing version instead of creating it a second time.
    app = public_app()
    if app["latest_release"]["version"] != version:
        raise RuntimeError("The public store has not confirmed the new version.")
    download = requests.get(app["latest_release"]["pbw_file"], timeout=90)
    download.raise_for_status()
    if hashlib.sha256(download.content).hexdigest() != digest:
        raise RuntimeError("Published version has a different package. Use a new version; do not overwrite it.")

    # The dashboard's documented-in-client session + multipart edit flow.
    # Updating text does not replace screenshots or existing release history.
    with requests.Session() as session:
        response = session.post(API + "/api/auth/firebase/session", json={"idToken": token}, timeout=30)
        response.raise_for_status()
        values = {"title": "Dymaxion", "description": copy,
                  "website": "https://huntrontrakkr.github.io/dymaxion-watch-face/",
                  "source": "https://github.com/huntrontrakkr/dymaxion-watch-face", "visibility": "listed"}
        response = session.patch(API + "/api/dashboard/apps/" + APP_ID,
                                 files={key: (None, value) for key, value in values.items()}, timeout=45)
        response.raise_for_status()
    app = public_app()
    if app.get("description") != copy or not app.get("visible") or not app.get("screenshot_images"):
        raise RuntimeError("Release uploaded, but listing verification failed.")
    print(f"Verified public release {version}: {STORE}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(f"Published **Dymaxion {version}** to [Pebble]({STORE}).\n\nPublic download SHA-256: `{digest}`.\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["package", "check", "publish"])
    parser.add_argument("--tag")
    parser.add_argument("--pbw", type=Path, default=ROOT / "release-artifacts/dymaxion.pbw")
    args = parser.parse_args()
    version = version_for(args.tag)
    if args.command == "package":
        package(version)
    elif args.command == "check":
        print("Verified", version, validate_pbw(args.pbw, version)); description()
    else:
        publish(args.pbw, version)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Release failed:", str(error), file=sys.stderr)
        sys.exit(1)
