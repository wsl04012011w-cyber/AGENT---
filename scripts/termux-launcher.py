#!/usr/bin/env python3
"""
AGENT--- Launcher v2.0
Inicia FreeLLMAPI + Proxy CORS + Cloudflare Tunnel
"""

import subprocess
import threading
import time
import re
import sys
import os
import http.server
import socketserver
import urllib.request
import urllib.error
from datetime import datetime

# Cores pro terminal
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
    ║   🤖 AGENT--- LAUNCHER v2.0           ║
    ║                                       ║
    ║   FreeLLMAPI + CORS Proxy + Tunnel    ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    {Colors.END}""")

def print_status(msg, status="info"):
    icons = {
        "info": "ℹ️",
        "success": "✅",
        "error": "❌",
        "warning": "⚠️",
        "loading": "⏳"
    }
    colors = {
        "info": Colors.BLUE,
        "success": Colors.GREEN,
        "error": Colors.RED,
        "warning": Colors.YELLOW,
        "loading": Colors.CYAN
    }
    print(f"{colors.get(status, Colors.BLUE)}{icons.get(status, 'ℹ️')} {msg}{Colors.END}")

# ============================================================
# CORS PROXY HANDLER
# ============================================================

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):
    target_host = "localhost"
    target_port = 3001

    def log_message(self, format, *args):
        # Silencia logs do proxy
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
            # Lê o body se tiver
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None

            # Monta URL de destino
            target_url = f"http://{self.target_host}:{self.target_port}{self.path}"

            # Cria request
            req = urllib.request.Request(
                target_url,
                data=body,
                method=method,
                headers={
                    key: value for key, value in self.headers.items()
                    if key.lower() not in ['host', 'connection', 'origin']
                }
            )

            # Faz a request
            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                self._set_cors_headers()

                # Copia headers da resposta (exceto CORS e hop-by-hop)
                for header, value in response.headers.items():
                    if header.lower() not in [
                        'access-control-allow-origin',
                        'access-control-allow-methods',
                        'access-control-allow-headers',
                        'transfer-encoding',
                        'connection'
                    ]:
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
    """Inicia o proxy CORS na porta especificada"""
    try:
        with socketserver.TCPServer(("", port), CORSProxyHandler) as httpd:
            print_status(f"Proxy CORS rodando em http://localhost:{port}", "success")
            httpd.serve_forever()
    except Exception as e:
        print_status(f"Erro no proxy CORS: {e}", "error")

# ============================================================
# PROCESS MANAGER
# ============================================================

class ProcessManager:
    def __init__(self):
        self.processes = {}
        self.tunnel_url = None
        self.local_url = "http://localhost:3001"
        self.proxy_url = "http://localhost:3002"

    def start_freellmapi(self):
        """Inicia o servidor FreeLLMAPI"""
        print_status("Iniciando FreeLLMAPI...", "loading")

        env = os.environ.copy()
        env["HOST"] = "0.0.0.0"

        try:
            proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=os.path.expanduser("~/freellmapi"),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.processes["freellmapi"] = proc

            # Aguarda o servidor iniciar
            for line in proc.stdout:
                if "Server running" in line or "listening" in line.lower():
                    print_status(f"FreeLLMAPI rodando em {self.local_url}", "success")
                    return True

            return True

        except Exception as e:
            print_status(f"Erro ao iniciar FreeLLMAPI: {e}", "error")
            return False

    def start_tunnel(self, target_port=3002):
        """Inicia o Cloudflare Tunnel apontando pro proxy CORS"""
        print_status("Iniciando Cloudflare Tunnel...", "loading")

        try:
            proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", f"http://localhost:{target_port}"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.processes["tunnel"] = proc

            # Captura a URL do túnel
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
        """Imprime resumo das URLs"""
        print(f"""
{Colors.GREEN}{Colors.BOLD}╔═══════════════════════════════════════════════════════════════╗
║                    🚀 AGENT--- ESTÁ NO AR!                     ║
╠═══════════════════════════════════════════════════════════════╣{Colors.END}

{Colors.RED}🔒 DIRETO (bloqueado por CORS no navegador):{Colors.END}
   {Colors.BOLD}{self.local_url}{Colors.END}
   {Colors.YELLOW}└─ Só funciona com curl no Termux{Colors.END}

{Colors.CYAN}🛡️  PROXY CORS (local, sem bloqueio):{Colors.END}
   {Colors.BOLD}{self.proxy_url}{Colors.END}
   {Colors.YELLOW}└─ Use para testar no navegador do celular{Colors.END}

{Colors.PURPLE}🌐 TÚNEL + CORS (funciona de qualquer lugar):{Colors.END}
   {Colors.BOLD}{self.tunnel_url}{Colors.END}
   {Colors.YELLOW}└─ ✅ USE ESTE NO AGENT--- (Vercel){Colors.END}

{Colors.BLUE}🔑 API ENDPOINT:{Colors.END}
   {Colors.BOLD}{self.tunnel_url}/v1{Colors.END}

{Colors.GREEN}{Colors.BOLD}╠═══════════════════════════════════════════════════════════════╣
║  📱 No AGENT--- cole: {Colors.END}{Colors.BOLD}{self.tunnel_url.replace('https://', '')}{Colors.GREEN}              ║
╚═══════════════════════════════════════════════════════════════╝{Colors.END}

{Colors.YELLOW}⚠️  IMPORTANTE:{Colors.END}
   • Mantenha este terminal aberto
   • Para parar: Ctrl+C
   • A URL muda a cada reinício (modo quick tunnel)

{Colors.CYAN}💡 Fluxo: Navegador → Tunnel → Proxy CORS → FreeLLMAPI{Colors.END}
""")

    def cleanup(self):
        """Encerra todos os processos"""
        print_status("Encerrando processos...", "warning")
        for name, proc in self.processes.items():
            try:
                proc.terminate()
                print_status(f"{name} encerrado", "info")
            except:
                pass

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    deps = {
        "npm": "Node.js/npm",
        "cloudflared": "Cloudflare Tunnel (pkg install cloudflared)"
    }

    missing = []
    for cmd, name in deps.items():
        try:
            subprocess.run([cmd, "--version"], capture_output=True, check=True)
            print_status(f"{name} encontrado", "success")
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing.append(name)
            print_status(f"{name} NÃO encontrado", "error")

    if missing:
        print(f"\n{Colors.RED}❌ Dependências faltando:{Colors.END}")
        for dep in missing:
            print(f"   • {dep}")
        print(f"\n{Colors.YELLOW}💡 Instale com:{Colors.END}")
        print(f"   pkg install cloudflared")
        print(f"   pkg install nodejs")
        return False

    return True

def main():
    print_banner()

    # Verifica dependências
    if not check_dependencies():
        sys.exit(1)

    manager = ProcessManager()

    try:
        # Inicia proxy CORS em thread separada
        proxy_thread = threading.Thread(target=start_cors_proxy, args=(3002,))
        proxy_thread.daemon = True
        proxy_thread.start()
        time.sleep(1)

        # Inicia FreeLLMAPI em thread separada
        freellm_thread = threading.Thread(target=manager.start_freellmapi)
        freellm_thread.daemon = True
        freellm_thread.start()

        # Aguarda um pouco pro servidor iniciar
        print_status("Aguardando servidor iniciar...", "loading")
        time.sleep(5)

        # Inicia o túnel apontando pro proxy CORS (porta 3002)
        if manager.start_tunnel(target_port=3002):
            manager.print_summary()

            # Mantém o script rodando
            print_status("Pressione Ctrl+C para encerrar", "info")
            while True:
                time.sleep(1)
        else:
            print_status("Falha ao iniciar tunnel", "error")
            manager.cleanup()

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 Encerrando AGENT--- Launcher...{Colors.END}")
        manager.cleanup()
        print_status("Até logo!", "success")

if __name__ == "__main__":
    main()
