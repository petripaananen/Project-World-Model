#!/usr/bin/env python3
"""
Project World Model (PWM) - GPU VM Lifecycle & Automated Test Runner
====================================================================
This script orchestrates the lifecycle of a GCP Compute Engine GPU instance:
1. Starts the GPU VM instance.
2. Waits for the instance to become reachable via SSH.
3. SSHs into the instance to run the automated XPRIZE tests/simulations.
4. Guaranteed shutdown of the instance in a 'finally' block to prevent
   incurring unexpected running costs ($250 - $650/month).
"""

import sys
import subprocess
import time
import argparse

# Default Configuration
DEFAULT_PROJECT = "project-world-model"
DEFAULT_INSTANCE = "pwm-gpu-instance"
DEFAULT_ZONE = "us-central1-a"
DEFAULT_COMMAND = "cd ~/Project-World-Model && pytest"

def run_command(cmd, shell=False, capture_output=False):
    """Helper to run system commands."""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            check=True,
            text=True,
            capture_output=capture_output
        )
        return result.stdout.strip() if capture_output else None
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        if capture_output:
            print(f"Command stdout: {e.stdout}")
            print(f"Command stderr: {e.stderr}")
        raise e

def start_instance(project, instance, zone):
    print(f"🚀 Starting GCP GPU VM: {instance} in {zone}...")
    run_command(["gcloud", "compute", "instances", "start", instance, f"--zone={zone}", f"--project={project}"])
    print("✅ Instance startup command sent.")

def stop_instance(project, instance, zone):
    print(f"🛑 Shutting down GCP GPU VM: {instance} in {zone}...")
    try:
        run_command(["gcloud", "compute", "instances", "stop", instance, f"--zone={zone}", f"--project={project}", "--async"])
        print("✅ Shutdown command issued. The instance is stopping asynchronously.")
    except Exception as e:
        print(f"⚠️ Warning: Failed to stop instance automatically: {e}")
        print("🚨 CRITICAL: Please manually verify the VM is stopped in the GCP Console to avoid costs!")

def wait_for_ssh(project, instance, zone, max_retries=12, delay=10):
    print("⏳ Waiting for SSH to become available...")
    for i in range(max_retries):
        try:
            # Run a simple echo command to test connection
            run_command(
                ["gcloud", "compute", "ssh", instance, f"--zone={zone}", f"--project={project}", "--command=echo SSH Ready"],
                capture_output=True
            )
            print("❇️ SSH is ready!")
            return True
        except Exception:
            print(f"   [{i+1}/{max_retries}] VM not reachable yet. Retrying in {delay} seconds...")
            time.sleep(delay)
    raise TimeoutError("Timeout waiting for VM to become reachable via SSH.")

def run_tests(project, instance, zone, command):
    print(f"🖥️ Running automated tests on GPU VM: '{command}'")
    run_command(["gcloud", "compute", "ssh", instance, f"--zone={zone}", f"--project={project}", f"--command={command}"])

def main():
    parser = argparse.ArgumentParser(description="Run automated tests on a GCP GPU instance with guaranteed shutdown.")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"GCP Project ID (default: {DEFAULT_PROJECT})")
    parser.add_argument("--instance", default=DEFAULT_INSTANCE, help=f"GPU VM Instance Name (default: {DEFAULT_INSTANCE})")
    parser.add_argument("--zone", default=DEFAULT_ZONE, help=f"GCP Zone (default: {DEFAULT_ZONE})")
    parser.add_argument("--command", default=DEFAULT_COMMAND, help=f"Command to run on VM (default: {DEFAULT_COMMAND})")
    
    args = parser.parse_args()
    
    exit_code = 0
    try:
        # 1. Start the GPU VM
        start_instance(args.project, args.instance, args.zone)
        
        # 2. Wait for connectivity
        wait_for_ssh(args.project, args.instance, args.zone)
        
        # 3. Run the automated tests / simulations
        run_tests(args.project, args.instance, args.zone, args.command)
        print("🎉 Pipeline runs completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        exit_code = 1
        
    finally:
        # 4. ALWAYS shut down the instance to prevent runaway charges
        print("\n==================================================")
        stop_instance(args.project, args.instance, args.zone)
        print("==================================================")
        
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
