import sys
import os

# Create a small script to check the server status via SSH using paramiko or subprocess with sshpass
# Since I'm an AI, I'll write a Python script that uses subprocess to run the ssh command with the password if possible, 
# or I'll just use the run_command tool directly for simple non-interactive checks if the shell allows it.

# Let's try to read the leads.json file first using a non-interactive ssh command.
# Password is vB8#qR2!mZ5*pL9$wX1^

# We'll use a python script to wrap the ssh call to avoid shell escaping issues.
import subprocess

def run_ssh_cmd(cmd):
    # This is a bit insecure but the user allowed it for this session.
    # Note: sshpass is the cleanest way for this in a script.
    ssh_cmd = f"echo {sys.argv[1]} | sshpass -p '{sys.argv[1]}' ssh -o StrictHostKeyChecking=no root@204.168.207.116 '{cmd}'"
    # Actually, let's use a more robust way.
    try:
        result = subprocess.run(['sshpass', '-p', sys.argv[1], 'ssh', '-o', 'StrictHostKeyChecking=no', 'root@204.168.207.116', cmd], capture_output=True, text=True)
        return result.stdout, result.stderr
    except Exception as e:
        return "", str(e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <password>")
        sys.exit(1)
    
    password = sys.argv[1]
    
    # 1. Check leads.json
    out, err = run_ssh_cmd("cat /root/.openclaw/workspace/leads.json")
    print(f"--- LEADS.JSON ---\n{out}\n{err}")

    # 2. Check current openclaw process
    out, err = run_ssh_cmd("ps aux | grep openclaw")
    print(f"--- PROCESSES ---\n{out}")
