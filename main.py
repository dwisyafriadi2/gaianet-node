import requests
import json
import time
import random
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load environment variables from .env file
load_dotenv()

# Read API token, URL, and other configurations from the environment variables
auth_token = os.getenv('GAIANET_AUTH_TOKEN')
api_url = os.getenv('API_URL')
sleep_interval = int(os.getenv('SLEEP_INTERVAL', 5))  # Default delay is 5 seconds

# Validate environment variables
if not auth_token or not api_url:
    logging.error("Missing required environment variables. Check your .env file.")
    exit()

# Load questions from a file
def load_questions(filename="questions.txt"):
    """
    Load questions from a text file. Each line in the file is a question.
    """
    try:
        with open(filename, "r") as file:
            questions = [line.strip() for line in file.readlines() if line.strip()]
        if not questions:
            raise ValueError("The questions file is empty.")
        return questions
    except FileNotFoundError:
        logging.error(f"Error: {filename} not found. Please create the file with your questions.")
        exit()
    except Exception as e:
        logging.error(f"Error while loading questions: {e}")
        exit()

# Load questions dynamically
questions = load_questions()

def generate_question():
    """
    Generate one random question from the loaded questions.
    """
    return random.choice(questions)

def send_gaianet_request(message):
    """
    Send the question to the GaiaNet API and print the response.
    """
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'accept': 'application/json',
        'Content-Type': 'application/json',
    }

    data = {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": message},
        ]
    }

    try:
        logging.info(f"Sending question to GaiaNet API: {message}")
        response = requests.post(api_url, headers=headers, data=json.dumps(data))

        if response.status_code == 200:
            response_json = response.json()
            # Extract and print the GaiaNet response
            gaianet_response = response_json.get("choices", [{}])[0].get("message", {}).get("content", "No response")
            logging.info(f"Response from GaiaNet: {gaianet_response}")
        else:
            logging.error(f"Error: GaiaNet API returned {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        logging.error(f"GaiaNet API request failed: {e}")

def main():
    """
    Main function to select a random question and send it to GaiaNet.
    """
    while True:
        try:
            # Generate a random question
            question = generate_question()

            # Send the question to GaiaNet API
            logging.info(f"Selected Question: {question}")
            send_gaianet_request(question)

            # Add a delay between iterations to prevent overloading the API
            time.sleep(sleep_interval)
        except KeyboardInterrupt:
            logging.info("Program interrupted by user. Exiting...")
            break
        except Exception as e:
            logging.error(f"Unexpected error in main loop: {e}")
            time.sleep(sleep_interval)

# Run the main function
if __name__ == "__main__":
    main()
