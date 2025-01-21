#!/bin/bash

# Function to display the main menu
show_menu() {
    curl -s https://raw.githubusercontent.com/dwisyafriadi2/logo/main/logo.sh | bash
    echo "=============================="
    echo " GaiaNet Node Management Menu "
    echo "=============================="
    echo "1. Install GaiaNet Node"
    echo "2. Initialize Node"
    echo "3. Start Node"
    echo "4. Stop Node"
    echo "5. Uninstall GaiaNet Node"
    echo "6. Auto Interaction with Your Node"
    echo "7. Check Node ID and Device ID"
    echo "8. Exit"
    echo "=============================="
}

# Function to install GaiaNet Node
install_node() {
    echo "Installing GaiaNet Node..."
    curl -sSfL 'https://github.com/GaiaNet-AI/gaianet-node/releases/latest/download/install.sh' | bash
    source "$HOME/.bashrc"
}

# Function to initialize the node
initialize_node() {
    echo "Initializing GaiaNet Node..."
    if [ -f "$HOME/.bashrc" ]; then
        echo "Loading environment variables from .bashrc..."
        source "$HOME/.bashrc"
    else
        echo "No .bashrc file found. Skipping..."
    fi
    gaianet init
    echo "Initialization completed."
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

# Function to run auto interaction with the node
auto_interaction() {
    echo "Starting Auto Interaction with Your Node..."
    check_node_version
    local script_path="$HOME/home/bot/gaianet-node/main.js"
    local log_file="$HOME/interaction.log"
    local pid_file="$HOME/interaction.pid"

    if [ ! -f "$script_path" ]; then
        echo "Error: Node.js script not found at $script_path"
        return
    fi

    node "$script_path" > "$log_file" 2>&1 &
    echo $! > "$pid_file"

    echo "Auto Interaction started in the background."
    echo "Logs are being saved to $log_file."
    echo "Process ID (PID): $(cat $pid_file)"
}

# Function to check Node ID and Device ID
check_node_info() {
    echo "Checking Node ID and Device ID..."
    gaianet info
}

# Function to check Node.js version
check_node_version() {
    if command -v node > /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//; s/\\..*//')
        if [ "$NODE_VERSION" -lt 18 ]; then
            echo "Node.js version is less than 18. Installing Node.js 18..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            echo "Node.js version is sufficient: $(node -v)"
        fi
    else
        echo "Node.js is not installed. Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice [1-8]: " choice
    case $choice in
        1) install_node ;;
        2) initialize_node ;;
        3) start_node ;;
        4) stop_node ;;
        5) uninstall_node ;;
        6) auto_interaction ;;
        7) check_node_info ;;
        8) echo "Exiting..."; exit 0 ;;
        *) echo "Invalid choice. Please select a number between 1 and 8." ;;
    esac
    echo ""
done
