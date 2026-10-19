#!/usr/bin/env python3
"""
AGENT--- Launcher
Inicia FreeLLMAPI + Cloudflare Tunnel com um comando
"""

import subprocess
import threading
import time
import re
import sys
import os
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
    ║   🤖 AGENT--- LAUNCHER v1.0           ║
    ║                                       ║
    ║   Inicia FreeLLMAPI + Cloudflare      ║
    ║   Tunnel automaticamente              ║
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

class ProcessManager:
    def __init__(self):
        self.processes = {}
        self.tunnel_url = None
        self.local_url = "http://localhost:3001"

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
                if "error" in line.lower() and "warn" not in line.lower():
                    print_status(f"Erro: {line.strip()}", "error")

            return True

        except Exception as e:
            print_status(f"Erro ao iniciar FreeLLMAPI: {e}", "error")
            return False

    def start_tunnel(self):
        """Inicia o Cloudflare Tunnel e captura a URL"""
        print_status("Iniciando Cloudflare Tunnel...", "loading")

        try:
            proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", "http://localhost:3001"],
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

{Colors.CYAN}📍 LOCAL (só funciona no Termux):{Colors.END}
   {Colors.BOLD}{self.local_url}{Colors.END}
   {Colors.YELLOW}└─ Use para testar com curl no Termux{Colors.END}

{Colors.PURPLE}🌐 TÚNEL (funciona de qualquer lugar):{Colors.END}
   {Colors.BOLD}{self.tunnel_url}{Colors.END}
   {Colors.YELLOW}└─ Use no AGENT--- (Vercel){Colors.END}

{Colors.BLUE}🔑 API ENDPOINT:{Colors.END}
   {Colors.BOLD}{self.tunnel_url}/v1{Colors.END}

{Colors.GREEN}{Colors.BOLD}╠═══════════════════════════════════════════════════════════════╣
║  📱 No AGENT--- cole: {Colors.END}{Colors.BOLD}{self.tunnel_url.replace('https://', '')}{Colors.GREEN}              ║
╚═══════════════════════════════════════════════════════════════╝{Colors.END}

{Colors.YELLOW}⚠️  IMPORTANTE:{Colors.END}
   • Mantenha este terminal aberto
   • Para parar: Ctrl+C
   • A URL muda a cada reinício (modo quick tunnel)

{Colors.CYAN}💡 Dica: Salve a URL no AGENT--- para não perder!{Colors.END}
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
        # Inicia FreeLLMAPI em thread separada
        freellm_thread = threading.Thread(target=manager.start_freellmapi)
        freellm_thread.daemon = True
        freellm_thread.start()

        # Aguarda um pouco pro servidor iniciar
        print_status("Aguardando servidor iniciar...", "loading")
        time.sleep(5)

        # Inicia o túnel
        if manager.start_tunnel():
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
