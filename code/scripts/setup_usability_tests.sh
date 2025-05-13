#!/usr/bin/env bash
# setup_usability_tests.sh - Prepare environment for user testing sessions

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "📊 Setting up environment for user testing sessions..."
echo "Script directory: $SCRIPT_DIR"

# Change to the script directory
cd "$SCRIPT_DIR"

# Ensure required Python packages are installed
echo "Installing required packages..."
pip install tqdm numpy requests flask flask-cors

# Reset response times database
echo -e "\n🗄️ Resetting response times database..."
python manage_response_times.py reset

# Check if Flask server is running
echo -e "\n🔍 Checking if Flask server is running..."
if ! curl -s http://127.0.0.1:5000/api/response_time > /dev/null; then
    echo "⚠️ Flask server does not appear to be running."
    echo "Please start the Flask server in another terminal:"
    echo "   python scripts/generate_recommendations.py"
    
    read -p "Continue setup anyway? [y/N]: " continue_setup
    if [[ ! $continue_setup =~ ^[Yy]$ ]]; then
        echo "Setup aborted. Please start the Flask server and try again."
        exit 1
    fi
fi

# Ask if user wants to seed with synthetic data or run real simulations
echo -e "\n⚙️ How would you like to prepare the response times database?"
echo "1) Seed with synthetic data (fast, less accurate)"
echo "2) Run actual simulations (slower, more accurate)"
echo "3) Both (run simulations, then supplement with synthetic data)"
read -p "Select option [1-3]: " option

case $option in
  1)
    # Seed with synthetic data
    echo -e "\n🔢 Seeding response times database with synthetic data..."
    read -p "Average response time in seconds [8.0]: " avg_time
    avg_time=${avg_time:-8.0}
    
    read -p "Number of synthetic entries [10]: " count
    count=${count:-10}
    
    python manage_response_times.py seed --count $count --time $avg_time
    ;;
    
  2)
    # Run actual simulations
    echo -e "\n🚀 Running trip simulations to generate response times..."
    read -p "Number of simulations to run [5]: " num_trips
    num_trips=${num_trips:-5}
    
    python simulate_trips.py --num-trips $num_trips
    ;;
    
  3)
    # Run simulations, then supplement with synthetic data
    echo -e "\n🚀 Running trip simulations to generate response times..."
    read -p "Number of simulations to run [3]: " num_trips
    num_trips=${num_trips:-3}
    
    python simulate_trips.py --num-trips $num_trips
    
    # Check current stats
    current_stats=$(python manage_response_times.py view)
    echo "$current_stats"
    
    # Ask if user wants to supplement with more synthetic data
    read -p "Add more synthetic data? [y/N]: " add_synthetic
    if [[ $add_synthetic == "y" || $add_synthetic == "Y" ]]; then
        read -p "Additional synthetic entries to add [5]: " add_count
        add_count=${add_count:-5}
        
        # First, get the current database
        response_times_json="../static/assets/data/response_times.json"
        if [ -f "$response_times_json" ]; then
            current_avg=$(python -c "import json; print(json.load(open('$response_times_json'))['average'])")
            python manage_response_times.py seed --count $add_count --time $current_avg
        else
            python manage_response_times.py seed --count $add_count
        fi
    fi
    ;;
    
  *)
    echo "Invalid option. Exiting."
    exit 1
    ;;
esac

# View the final database stats
echo -e "\n📈 Final response times database:"
python manage_response_times.py view

echo -e "\n✅ Setup complete! Your environment is ready for user testing."
echo "To start the Flask server (if not already running): python scripts/generate_recommendations.py"
echo "To serve the frontend: npx serve"

# Optionally create a fake response if the Flask server is not running
if ! curl -s http://127.0.0.1:5000/api/response_time > /dev/null; then
    echo -e "\n⚠️ Note: Since the Flask server is not running, we've created"
    echo "   response time data that will be used once the server starts."
fi