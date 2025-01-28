import requests
import json
import time
import random
from dotenv import load_dotenv
import os
from groq import Groq  # Import the Groq library

# Load environment variables from .env file
load_dotenv()

# Read API token, URL, and other configurations from the environment variables
auth_token = os.getenv('GAIANET_AUTH_TOKEN')
api_url = os.getenv('API_URL')
groq_api_key = os.getenv('GROQ_API_KEY')

# Validate environment variables
if not auth_token or not api_url:
    print("Error: Missing GAIANET_AUTH_TOKEN or API_URL in the .env file.")
    exit()

if not groq_api_key:
    print("Error: Missing GROQ_API_KEY in the .env file.")
    exit()

# Initialize the Groq client
groq_client = Groq(api_key=groq_api_key)

# Model configuration for GROQ
MODEL_CONFIG = {
    "NAME": "mixtral-8x7b-32768",  # Replace with your valid GROQ model name
    "TEMPERATURE": 0.7,
    "MAX_TOKENS": 50,
}

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
        print(f"Error: {filename} not found. Please create the file with your questions.")
        exit()
    except Exception as e:
        print(f"Error while loading questions: {e}")
        exit()

# Load questions dynamically
questions = load_questions()

def generate_question():
    """
    Generate one random question from the loaded questions.
    """
    return random.choice(questions)

def send_groq_request(question):
    """
    Use the GROQ API to get a chat completion for the given question.
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "user", "content": question}
            ],
            model=MODEL_CONFIG["NAME"],
            temperature=MODEL_CONFIG["TEMPERATURE"],
            max_tokens=MODEL_CONFIG["MAX_TOKENS"],
        )
        return chat_completion.choices[0].message.content.strip()  # Return the response content
    except Exception as e:
        print(f"Failed to get response from GROQ API: {e}")
        return None

def send_gaianet_request(message):
    """
    Send the GROQ API's response to the GaiaNet API.
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
        response = requests.post(api_url, headers=headers, data=json.dumps(data))

        if response.status_code == 200:
            try:
                response_json = response.json()
                # Extract and print the GaiaNet response
                gaianet_response = response_json.get("choices", [{}])[0].get("message", {}).get("content", "No response")
                print(f"Response From Gaianet: {gaianet_response}\n")
            except json.JSONDecodeError:
                print(f"Error: Invalid JSON response from GaiaNet API: {response.text}")
        else:
            print(f"Error: GaiaNet API returned {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"GaiaNet API request failed: {e}")

def main():
    """
    Main function to generate a question, get a response from GROQ, and send it to GaiaNet.
    """
    while True:
        # Generate a single question
        question = generate_question()

        # Send the question to GROQ API
        groq_response = send_groq_request(question)

        # If GROQ API provides a valid response, send it to GaiaNet API
        if groq_response:
            print(f"Question: {question}")
            send_gaianet_request(groq_response)

        # Add a delay between iterations to prevent overloading the APIs
        time.sleep(5)

# Run the main function
if __name__ == "__main__":
    main()
