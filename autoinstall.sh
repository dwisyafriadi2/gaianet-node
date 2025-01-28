#!/bin/bash

# Function to display the main menu
show_menu() {
    curl -s https://raw.githubusercontent.com/dwisyafriadi2/logo/main/logo.sh | bash
    echo "=============================="
    echo " GaiaNet Node Management Menu "
    echo "=============================="
    echo "1. Install GaiaNet Node"
    echo "2. Initialize Model Default [Llama Model]"
    echo "3. Initialize Model Qwen 2.5"
    echo "4. Initialize Model Phi 3.5 Mini"
    echo "5. Start Node"
    echo "6. Stop Node"
    echo "7. Uninstall GaiaNet Node"
    echo "8. Auto Interaction with Your Node [V1]"
    echo "9. Auto Interaction with Your Node [V2]"
    echo "10. Check Node ID and Device ID"
    echo "11. Exit"
    echo "=============================="
}

# Function to install GaiaNet Node
install_node() {
    echo "Installing GaiaNet Node..."
    curl -sSfL 'https://github.com/GaiaNet-AI/gaianet-node/releases/latest/download/install.sh' | bash
    source "$HOME/.bashrc"
}

# Function to initialize the default Llama model
initialize_default_model() {
    echo "Initializing Model Default [Llama Model]..."
    gaianet init
    echo "Default model initialization completed."
}

# Function to initialize the Qwen 2.5 model
initialize_qwen_model() {
    echo "Initializing Model Qwen 2.5..."
    gaianet init --config https://raw.githubusercontent.com/GaiaNet-AI/node-configs/main/qwen2-0.5b-instruct/config.json
    echo "Qwen 2.5 model initialization completed."
}

# Function to initialize the Phi 3.5 Mini model
initialize_phi_model() {
    echo "Initializing Model Phi 3.5 Mini..."
    gaianet init --config https://raw.githubusercontent.com/GaiaNet-AI/node-configs/main/phi-3.5-mini-instruct/config.json
    echo "Phi 3.5 Mini model initialization completed."
}

# Function to start the node
start_node() {
    echo "Starting GaiaNet Node..."
    local port=8081
    while lsof -i :$port &>/dev/null; do
        echo "Port $port is already in use. Incrementing port..."
        port=$((port + 1))
    done
    echo "Using port $port for GaiaNet Node..."
    gaianet config --port $port
    gaianet init
    gaianet start
    echo "Node started on port $port."
}

# Function to stop the node
stop_node() {
    echo "Stopping GaiaNet Node..."
    gaianet stop
    echo "Node stopped."
}

# Function to uninstall GaiaNet Node
uninstall_node() {
    echo "Uninstalling GaiaNet Node..."
    curl -sSfL 'https://github.com/GaiaNet-AI/gaianet-node/releases/latest/download/uninstall.sh' | bash
    echo "Uninstallation completed."
}

# Function for Auto Interaction with Your Node [V1]
auto_interaction_v1() {
    echo "Starting Auto Interaction with Your Node [V1]..."
    check_node_version
    local script_path="$HOME/gaianet-node/main.js"
    local log_file="$HOME/interaction_v1.log"
    local pid_file="$HOME/interaction_v1.pid"

    if [ ! -f "$script_path" ]; then
        echo "Error: Node.js script not found at $script_path"
        return
    fi
    npm install
    node "$script_path" > "$log_file" 2>&1 &
    echo $! > "$pid_file"

    echo "Auto Interaction V1 started in the background."
    echo "Logs are being saved to $log_file."
    echo "Process ID (PID): $(cat $pid_file)"
}

# Function for Auto Interaction with Your Node [V2]
auto_interaction_v2() {
    echo "Starting Auto Interaction with Your Node [V2]..."
    check_python_version
    local script_path="$HOME/gaianet-node/main.py"
    local log_file="$HOME/interaction_v2.log"
    local pid_file="$HOME/interaction_v2.pid"

    if [ ! -f "$script_path" ]; then
        echo "Error: Python script not found at $script_path"
        return
    fi
    python3 -m venv env
    source env/bin/activate
    pip install -r "$HOME/gaianet-node/requirements.txt"
    pip3 install -r "$HOME/gaianet-node/requirements.txt"
    python3 "$script_path" > "$log_file" 2>&1 &
    echo $! > "$pid_file"

    echo "Auto Interaction V2 started in the background."
    echo "Logs are being saved to $log_file."
    echo "Process ID (PID): $(cat $pid_file)"
}

# Function to check Node ID and Device ID
check_node_info() {
    echo "Checking Node ID and Device ID..."
    gaianet info
}

# Function to check and enforce Node.js version 20
check_node_version() {
    if command -v node > /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//; s/\\..*//')
        if [ "$NODE_VERSION" -lt 20 ]; then
            echo "Node.js version is less than 20. Installing Node.js 20..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            echo "Node.js version is sufficient: $(node -v)"
        fi
    else
        echo "Node.js is not installed. Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

# Function to check and enforce Python version 3.x
check_python_version() {
    if command -v python3 > /dev/null; then
        echo "Python 3 is installed: $(python3 --version)"
        if ! dpkg -l | grep -q python3-venv; then
            echo "Installing python3-venv package..."
            sudo apt update
            sudo apt install -y python3-venv
            sudo apt install python3-pip
        fi
    else
        echo "Python 3 is not installed. Installing Python 3..."
        sudo apt update
        sudo apt install -y python3 python3-pip python3-venv
    fi
}


# Main loop
while true; do
    show_menu
    read -p "Enter your choice [1-11]: " choice
    case $choice in
        1) install_node ;;
        2) initialize_default_model ;;
        3) initialize_qwen_model ;;
        4) initialize_phi_model ;;
        5) start_node ;;
        6) stop_node ;;
        7) uninstall_node ;;
        8) auto_interaction_v1 ;;
        9) auto_interaction_v2 ;;
        10) check_node_info ;;
        11) echo "Exiting..."; exit 0 ;;
        *) echo "Invalid choice. Please select a number between 1 and 11." ;;
    esac
    echo ""
done
