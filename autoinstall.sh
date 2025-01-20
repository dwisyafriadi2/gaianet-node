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
    echo "6. Exit"
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
    
    # Load .bashrc to ensure the environment variables are loaded
    if [ -f "$HOME/.bashrc" ]; then
        echo "Loading environment variables from .bashrc..."
        source "$HOME/.bashrc"
    else
        echo "No .bashrc file found. Skipping..."
    fi
    
    # Initialize the node
    gaianet init
    echo "Initialization completed."
}

# Function to start the node
start_node() {
    echo "Starting GaiaNet Node..."
    
    # Define the starting port
    local port=8080
    
    # Check if the port is in use and increment if necessary
    while lsof -i :$port &>/dev/null; do
        echo "Port $port is already in use. Incrementing port..."
        port=$((port + 1))
    done
    
    # Update GaiaNet configuration with the available port
    echo "Using port $port for GaiaNet Node..."
    gaianet config --port $port
    gaianet init
    
    # Start the node
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

# Main loop
while true; do
    show_menu
    read -p "Enter your choice [1-6]: " choice
    case $choice in
        1) install_node ;;
        2) initialize_node ;;
        3) start_node ;;
        4) stop_node ;;
        5) uninstall_node ;;
        6) echo "Exiting..."; exit 0 ;;
        *) echo "Invalid choice. Please select a number between 1 and 6." ;;
    esac
    echo ""
done
