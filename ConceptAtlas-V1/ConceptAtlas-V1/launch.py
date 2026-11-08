"""Launch ConceptAtlas locally. Prebuilt UI included; Node.js is only needed to edit it."""
from __future__ import annotations
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import venv
import webbrowser

ROOT=Path(__file__).resolve().parent

def main():
    parser=argparse.ArgumentParser(description='Start ConceptAtlas on your computer.')
    parser.add_argument('--demo', action='store_true', help='Use only Python standard library; no installation or AI connection.')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=8000)
    args=parser.parse_args()
    if sys.version_info<(3,11):
        raise SystemExit('Please install Python 3.11 or newer, then launch again.')
    if not (ROOT/'dist'/'index.html').exists():
        raise SystemExit('The prebuilt interface is missing. Run npm ci and npm run build first.')
    if not 1024<=args.port<=65535:
        raise SystemExit('Choose a port between 1024 and 65535.')
    url=f'http://127.0.0.1:{args.port}'
    with socket.socket() as check:
        try:check.bind(('127.0.0.1',args.port))
        except OSError:raise SystemExit(f'Port {args.port} is already in use. Close the existing server, or run: python launch.py --port {args.port+1}')
    if args.demo:
        command=[sys.executable,'-m','http.server',str(args.port),'--bind','127.0.0.1','--directory',str(ROOT/'dist')]
        print('Starting the self-contained demo. The prepared example is available; AI generation is disabled in demo mode.',flush=True)
    else:
        python=ROOT/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
        if not python.exists():
            print('Creating the local Python environment (first launch)…',flush=True)
            venv.EnvBuilder(with_pip=True).create(ROOT/'.venv')
        lock=ROOT/'backend'/'requirements.lock.txt'
        requirements=lock if lock.exists() else ROOT/'backend'/'requirements.txt'
        digest=hashlib.sha256(requirements.read_bytes()).hexdigest()
        marker=ROOT/'.venv'/'.conceptatlas-requirements'
        if not marker.exists() or marker.read_text()!=digest:
            print('Installing the local server dependencies. Internet is needed on the first launch.',flush=True)
            subprocess.run([str(python),'-m','pip','install','-r',str(requirements)],check=True)
            marker.write_text(digest)
        env=ROOT/'backend'/'.env'
        if not env.exists():shutil.copyfile(ROOT/'backend'/'.env.example',env)
        command=[str(python),'-m','uvicorn','backend.app:app','--host','127.0.0.1','--port',str(args.port)]
    process=subprocess.Popen(command,cwd=ROOT)
    try:
        ready=False
        for _ in range(100):
            if process.poll() is not None:raise SystemExit('The server stopped before it was ready. See the message above.')
            try:
                with urllib.request.urlopen(url,timeout=1) as r:ready=r.status==200
                if ready:break
            except OSError:time.sleep(.2)
        if not ready:raise SystemExit('The server did not become ready. Check its startup messages.')
        print(f'\nConceptAtlas is ready: {url}\nKeep this terminal open. Press Ctrl+C to stop.\n',flush=True)
        if not args.no_browser:webbrowser.open(url)
        process.wait()
    except KeyboardInterrupt:
        print('\nStopping ConceptAtlas…',flush=True)
    finally:
        if process.poll() is None:
            process.terminate()
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill()

if __name__=='__main__':
    try:main()
    except subprocess.CalledProcessError:
        raise SystemExit('Installation failed. Check your connection, or use START_DEMO.bat / python launch.py --demo.')
