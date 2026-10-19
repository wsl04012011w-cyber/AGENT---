#!/usr/bin/env python3
"""
AGENT--- Launcher v3.0
FreeLLMAPI + CORS Proxy + Ngrok (URL fixa!)
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
from datetime import datetime

# ============================================================
# CONFIGURAÇÕES
# ============================================================

CONFIG_FILE = Path.home() / ".agent_launcher_config.json"
DEFAULT_CONFIG = {
    "ngrok_token": "",
    "ngrok_domain": "approve-energetic-jogger.ngrok-free.dev",
    "freellmapi_path": "~/freellmapi",
    "proxy_port": 3002,
    "api_port": 3001,
}

def load_config():
    """Carrega configuração salva"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                saved = json.load(f)
                return {**DEFAULT_CONFIG, **saved}
        except:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(config):
    """Salva configuração"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

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
    ║   🤖 AGENT--- LAUNCHER v3.0           ║
    ║                                       ║
    ║   FreeLLMAPI + CORS Proxy + Ngrok     ║
    ║   URL FIXA - configure uma vez!       ║
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

            req = urllib.request.Request(
                target_url,
                data=body,
                method=method,
                headers={
                    key: value for key, value in self.headers.items()
                    if key.lower() not in ['host', 'connection', 'origin']
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                self._set_cors_headers()

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
    """Inicia o proxy CORS"""
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
    def __init__(self, config):
        self.config = config
        self.processes = {}
        self.ngrok_url = f"https://{config['ngrok_domain']}"
        self.local_url = f"http://localhost:{config['api_port']}"
        self.proxy_url = f"http://localhost:{config['proxy_port']}"

    def start_freellmapi(self):
        """Inicia o servidor FreeLLMAPI"""
        print_status("Iniciando FreeLLMAPI...", "loading")

        env = os.environ.copy()
        env["HOST"] = "0.0.0.0"

        freellm_path = os.path.expanduser(self.config["freellmapi_path"])

        try:
            proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=freellm_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.processes["freellmapi"] = proc

            for line in proc.stdout:
                if "Server running" in line or "listening" in line.lower():
                    print_status(f"FreeLLMAPI rodando em {self.local_url}", "success")
                    return True

            return True

        except Exception as e:
            print_status(f"Erro ao iniciar FreeLLMAPI: {e}", "error")
            return False

    def setup_ngrok(self):
        """Configura o ngrok com o token"""
        token = self.config.get("ngrok_token", "")
        if not token:
            return False

        try:
            # Configura o token
            subprocess.run(
                ["ngrok", "config", "add-authtoken", token],
                capture_output=True,
                check=True
            )
            return True
        except:
            return False

    def start_ngrok(self):
        """Inicia o ngrok com domínio fixo"""
        print_status("Iniciando Ngrok...", "loading")

        try:
            proc = subprocess.Popen(
                [
                    "ngrok", "http", 
                    f"--url={self.config['ngrok_domain']}",
                    f"{self.config['proxy_port']}"
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.processes["ngrok"] = proc

            # Aguarda ngrok iniciar
            time.sleep(3)
            return True

        except Exception as e:
            print_status(f"Erro ao iniciar ngrok: {e}", "error")
            return False

    def print_summary(self):
        """Imprime resumo das URLs"""
        domain = self.config['ngrok_domain']
        print(f"""
{Colors.GREEN}{Colors.BOLD}╔═══════════════════════════════════════════════════════════════╗
║                    🚀 AGENT--- ESTÁ NO AR!                     ║
╠═══════════════════════════════════════════════════════════════╣{Colors.END}

{Colors.RED}🔒 DIRETO (bloqueado por CORS):{Colors.END}
   {Colors.BOLD}{self.local_url}{Colors.END}

{Colors.CYAN}🛡️  PROXY CORS (local):{Colors.END}
   {Colors.BOLD}{self.proxy_url}{Colors.END}

{Colors.PURPLE}🌐 NGROK (URL FIXA - use sempre esta!):{Colors.END}
   {Colors.BOLD}{self.ngrok_url}{Colors.END}
   {Colors.GREEN}└─ ✅ URL fixa, não muda nunca!{Colors.END}

{Colors.BLUE}🔑 API ENDPOINT:{Colors.END}
   {Colors.BOLD}{self.ngrok_url}/v1{Colors.END}

{Colors.GREEN}{Colors.BOLD}╠═══════════════════════════════════════════════════════════════╣
║  📱 No AGENT--- cole: {Colors.END}{Colors.BOLD}{domain}{Colors.GREEN}              ║
╚═══════════════════════════════════════════════════════════════╝{Colors.END}

{Colors.YELLOW}⚠️  IMPORTANTE:{Colors.END}
   • Mantenha este terminal aberto
   • Para parar: Ctrl+C
   • URL fixa: {domain}

{Colors.CYAN}💡 Fluxo: Navegador → Ngrok → Proxy CORS → FreeLLMAPI{Colors.END}
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
    """Verifica dependências"""
    deps = {
        "npm": "Node.js/npm",
        "ngrok": "Ngrok (pkg install ngrok)"
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
        print(f"   pkg install ngrok")
        print(f"   pkg install nodejs")
        return False

    return True

def setup_wizard(config):
    """Wizard de configuração inicial"""
    print(f"\n{Colors.CYAN}{Colors.BOLD}🔧 Configuração Inicial{Colors.END}\n")

    # Ngrok token
    if not config.get("ngrok_token"):
        print(f"{Colors.YELLOW}📝 Para usar Ngrok com URL fixa, você precisa:{Colors.END}")
        print(f"   1. Criar conta em: https://dashboard.ngrok.com/signup")
        print(f"   2. Copiar o token em: https://dashboard.ngrok.com/get-started/your-authtoken")
        print(f"   3. Reservar domínio em: https://dashboard.ngrok.com/cloud-edge/domains")
        print()

        token = input(f"{Colors.CYAN}Cole seu Ngrok Authtoken: {Colors.END}").strip()
        if token:
            config["ngrok_token"] = token
            print_status("Token salvo!", "success")

        domain = input(f"{Colors.CYAN}Cole seu domínio Ngrok (ex: seu-dominio.ngrok-free.dev): {Colors.END}").strip()
        if domain:
            config["ngrok_domain"] = domain
            print_status("Domínio salvo!", "success")

        save_config(config)
        print(f"\n{Colors.GREEN}✅ Configuração salva em {CONFIG_FILE}{Colors.END}\n")
    else:
        print_status(f"Token Ngrok já configurado", "success")
        print_status(f"Domínio: {config['ngrok_domain']}", "info")

def main():
    print_banner()

    # Carrega configuração
    config = load_config()

    # Verifica dependências
    if not check_dependencies():
        sys.exit(1)

    # Setup inicial se necessário
    setup_wizard(config)

    manager = ProcessManager(config)

    try:
        # Configura ngrok
        if config.get("ngrok_token"):
            print_status("Configurando Ngrok...", "loading")
            manager.setup_ngrok()

        # Inicia proxy CORS
        proxy_thread = threading.Thread(
            target=start_cors_proxy, 
            args=(config["proxy_port"],)
        )
        proxy_thread.daemon = True
        proxy_thread.start()
        time.sleep(1)

        # Inicia FreeLLMAPI
        freellm_thread = threading.Thread(target=manager.start_freellmapi)
        freellm_thread.daemon = True
        freellm_thread.start()

        print_status("Aguardando servidor iniciar...", "loading")
        time.sleep(5)

        # Inicia Ngrok
        if manager.start_ngrok():
            time.sleep(2)
            manager.print_summary()

            print_status("Pressione Ctrl+C para encerrar", "info")
            while True:
                time.sleep(1)
        else:
            print_status("Falha ao iniciar Ngrok", "error")
            manager.cleanup()

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 Encerrando AGENT--- Launcher...{Colors.END}")
        manager.cleanup()
        print_status("Até logo!", "success")

if __name__ == "__main__":
    main()
