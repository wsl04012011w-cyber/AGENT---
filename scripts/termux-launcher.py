#!/usr/bin/env python3
"""
AGENT--- Launcher v4.0
FreeLLMAPI + CORS Proxy + Cloudflare Tunnel
"""

import subprocess
import threading
import time
import re
import sys
import os
import json
import http.server
import socketserver
import urllib.request
import urllib.error
from pathlib import Path

CONFIG_FILE = Path.home() / ".agent_launcher_config.json"
DEFAULT_CONFIG = {
    "freellmapi_path": "~/freellmapi",
    "proxy_port": 3002,
    "api_port": 3001,
}

def load_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                saved = json.load(f)
                return {**DEFAULT_CONFIG, **saved}
        except:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

class Colors:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    print(f"""{Colors.PURPLE}{Colors.BOLD}
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║   🤖 AGENT--- LAUNCHER v4.0           ║
    ║                                       ║
    ║   FreeLLMAPI + CORS Proxy + Cloudflare║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    {Colors.END}""")

def print_status(msg, status="info"):
    icons = {"info": "ℹ️", "success": "✅", "error": "❌", "warning": "⚠️", "loading": "⏳"}
    colors = {"info": Colors.BLUE, "success": Colors.GREEN, "error": Colors.RED, "warning": Colors.YELLOW, "loading": Colors.CYAN}
    print(f"{colors.get(status, Colors.BLUE)}{icons.get(status, 'ℹ️')} {msg}{Colors.END}")

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):
    target_host = "localhost"
    target_port = 3001

    def log_message(self, format, *args):
        pass

    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
        self.send_header('Access-Control-Max-Age', '86400')

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._proxy_request('GET')

    def do_POST(self):
        self._proxy_request('POST')

    def do_PUT(self):
        self._proxy_request('PUT')

    def do_DELETE(self):
        self._proxy_request('DELETE')

    def do_PATCH(self):
        self._proxy_request('PATCH')

    def _proxy_request(self, method):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            target_url = f"http://{self.target_host}:{self.target_port}{self.path}"

            req = urllib.request.Request(target_url, data=body, method=method, headers={k: v for k, v in self.headers.items() if k.lower() not in ['host', 'connection', 'origin']})

            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                self._set_cors_headers()
                for header, value in response.headers.items():
                    if header.lower() not in ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'transfer-encoding', 'connection']:
                        self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(500)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

def start_cors_proxy(port=3002):
    try:
        with socketserver.TCPServer(("", port), CORSProxyHandler) as httpd:
            print_status(f"Proxy CORS rodando em http://localhost:{port}", "success")
            httpd.serve_forever()
    except Exception as e:
        print_status(f"Erro no proxy CORS: {e}", "error")

class ProcessManager:
    def __init__(self, config):
        self.config = config
        self.processes = {}
        self.tunnel_url = None
        self.local_url = f"http://localhost:{config['api_port']}"
        self.proxy_url = f"http://localhost:{config['proxy_port']}"

    def start_freellmapi(self):
        print_status("Iniciando FreeLLMAPI...", "loading")
        env = os.environ.copy()
        env["HOST"] = "0.0.0.0"
        freellm_path = os.path.expanduser(self.config["freellmapi_path"])

        try:
            proc = subprocess.Popen(["npm", "run", "dev"], cwd=freellm_path, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            self.processes["freellmapi"] = proc

            for line in proc.stdout:
                if "Server running" in line or "listening" in line.lower():
                    print_status(f"FreeLLMAPI rodando em {self.local_url}", "success")
                    return True
            return True
        except Exception as e:
            print_status(f"Erro ao iniciar FreeLLMAPI: {e}", "error")
            return False

    def wait_for_service(self, url, timeout=30):
        print_status(f"Aguardando {url}...", "loading")
        for i in range(timeout):
            try:
                urllib.request.urlopen(url, timeout=2)
                return True
            except:
                time.sleep(1)
        return False

    def start_tunnel(self):
        print_status("Iniciando Cloudflare Tunnel...", "loading")
        try:
            proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", f"http://localhost:{self.config['proxy_port']}"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.processes["tunnel"] = proc

            url_pattern = r"https://[a-zA-Z0-9-]+\.trycloudflare\.com"

            for line in proc.stdout:
                match = re.search(url_pattern, line)
                if match:
                    self.tunnel_url = match.group(0)
                    return True
            return False
        except Exception as e:
            print_status(f"Erro ao iniciar tunnel: {e}", "error")
            return False

    def print_summary(self):
        print(f"""
{Colors.GREEN}{Colors.BOLD}╔═══════════════════════════════════════════════════════════════╗
║                    🚀 AGENT--- ESTÁ NO AR!                     ║
╠═══════════════════════════════════════════════════════════════╣{Colors.END}

{Colors.RED}🔒 DIRETO (bloqueado por CORS):{Colors.END}
   {Colors.BOLD}{self.local_url}{Colors.END}

{Colors.CYAN}🛡️  PROXY CORS (local):{Colors.END}
   {Colors.BOLD}{self.proxy_url}{Colors.END}

{Colors.PURPLE}🌐 TÚNEL CLOUDFLARE:{Colors.END}
   {Colors.BOLD}{self.tunnel_url}{Colors.END}
   {Colors.YELLOW}└─ Copie esta URL!{Colors.END}

{Colors.BLUE}🔑 API ENDPOINT:{Colors.END}
   {Colors.BOLD}{self.tunnel_url}/v1{Colors.END}

{Colors.GREEN}{Colors.BOLD}╠═══════════════════════════════════════════════════════════════╣
║  📱 No AGENT--- cole: {Colors.END}{Colors.BOLD}{self.tunnel_url.replace('https://', '')}{Colors.GREEN}              ║
╚═══════════════════════════════════════════════════════════════╝{Colors.END}

{Colors.YELLOW}⚠️  IMPORTANTE:{Colors.END}
   • Mantenha este terminal aberto
   • Para parar: Ctrl+C
   • URL muda a cada reinício

{Colors.CYAN}💡 Fluxo: Navegador → Cloudflare → Proxy CORS → FreeLLMAPI{Colors.END}
""")

    def cleanup(self):
        print_status("Encerrando processos...", "warning")
        for name, proc in self.processes.items():
            try:
                proc.terminate()
                print_status(f"{name} encerrado", "info")
            except:
                pass

def check_dependencies():
    deps = {"npm": "Node.js/npm", "cloudflared": "Cloudflare Tunnel"}
    missing = []
    for cmd, name in deps.items():
        try:
            subprocess.run([cmd, "--version"], capture_output=True, check=True)
            print_status(f"{name} encontrado", "success")
        except:
            missing.append(name)
            print_status(f"{name} NÃO encontrado", "error")
    if missing:
        print(f"\n{Colors.RED}❌ Instale:{Colors.END}")
        for dep in missing:
            print(f"   pkg install {dep}")
        return False
    return True

def main():
    print_banner()
    config = load_config()

    if not check_dependencies():
        sys.exit(1)

    manager = ProcessManager(config)

    try:
        # 1. Proxy CORS
        proxy_thread = threading.Thread(target=start_cors_proxy, args=(config["proxy_port"],))
        proxy_thread.daemon = True
        proxy_thread.start()
        time.sleep(2)

        # 2. FreeLLMAPI
        freellm_thread = threading.Thread(target=manager.start_freellmapi)
        freellm_thread.daemon = True
        freellm_thread.start()

        # 3. Aguarda FreeLLMAPI
        if not manager.wait_for_service(f"http://localhost:{config['api_port']}", timeout=30):
            print_status("FreeLLMAPI não respondeu!", "error")
            manager.cleanup()
            sys.exit(1)

        # 4. Tunnel
        if manager.start_tunnel():
            manager.print_summary()
            print_status("Pressione Ctrl+C para encerrar", "info")
            while True:
                time.sleep(1)
        else:
            print_status("Falha ao iniciar tunnel", "error")
            manager.cleanup()

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 Encerrando...{Colors.END}")
        manager.cleanup()
        print_status("Até logo!", "success")

if __name__ == "__main__":
    main()
