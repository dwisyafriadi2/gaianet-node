import fs from "fs/promises";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const API_CONFIG = {
  GAIA_DOMAIN: process.env.GAIA_DOMAIN || "default-node-id",
  BASE_URL: process.env.BASE_URL || "gaia.domains",
  ENDPOINT: "/v1/chat/completions",
};

const API_URLS = {
  GAIANET: `https://${API_CONFIG.GAIA_DOMAIN}.${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINT}`,
};


const MODEL_CONFIG = {
  GROQ: {
    NAME: "mixtral-8x7b-32768",
    TEMPERATURE: 0.9,
    MAX_TOKENS: 1024,
  },
  GAIA: {
    NAME: "Phi-3-mini-4k-instruct",
  },
};


const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  INITIAL_WAIT: 5,
  NORMAL_WAIT: 10,
  ERROR_WAIT: 15,
};

const SYSTEM_PROMPTS = {
  GAIA_GUIDE:
    "You are a tour guide in Paris, France. Please answer the question from a Paris visitor accurately.",
  GROQ_USER: "You are a tourist using a tour guide in Paris, France.",
};

const TOPICS = [
  "What are the must-see places in Paris?",
  "Where can I eat good food in Paris?",
  "Which museums are popular in Paris?",
  "Where can I go shopping in Paris?",
  "What is the history of the Eiffel Tower?",
];


// Initialize Groq Client
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || "default-groq-api-key",
});

// Function to get the authentication token
async function getAuthToken() {
  const token = process.env.GAIANET_AUTH_TOKEN;
  if (!token) {
    throw new Error("Missing GAIANET_AUTH_TOKEN in environment variables.");
  }
  return token.trim();
}

// Create headers for GaiaNet API
function createGaianetHeaders(authToken) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
}

async function getGroqUserMessage(prompt) {
  try {
    const completion = await groqClient.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant answering brief queries." },
        { role: "user", content: prompt },
      ],
      model: MODEL_CONFIG.GROQ.NAME,
      temperature: 0.7, // Adjust temperature for more focused responses
      max_tokens: 50,   // Limit response length for brevity
    });
    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error(`Error in Groq interaction: ${error.message}`);
    throw error;
  }
}

// Interact with GaiaNet API
async function chatWithGaianet(message, authToken, retryCount = RETRY_CONFIG.MAX_ATTEMPTS) {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const headers = createGaianetHeaders(authToken);
      const payload = {
        model: MODEL_CONFIG.GAIA.NAME,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.GAIA_GUIDE },
          { role: "user", content: message },
        ],
        stream: true, // Enable streaming response
        stream_options: {
          include_usage: true,
        },
      };

      const response = await fetch(API_URLS.GAIANET, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const stream = response.body;
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      // Parse streaming response
      for await (const chunk of stream) {
        const textChunk = decoder.decode(chunk);
        buffer += textChunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                process.stdout.write(content);
              }
            } catch (e) {
              console.error(`Error parsing GaiaNet response: ${e.message}`);
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error(`Error in GaiaNet attempt ${attempt}: ${error.message}`);
      if (attempt < retryCount) {
        const waitTime = Math.min(RETRY_CONFIG.NORMAL_WAIT * attempt, RETRY_CONFIG.ERROR_WAIT);
        console.log(`Retrying in ${waitTime} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      } else {
        throw new Error(`Failed after ${retryCount} attempts: ${error.message}`);
      }
    }
  }
}

// Main function
async function main() {
  try {
    console.log("Starting Auto Chat Program...");

    const gaianetToken = await getAuthToken();

    let interactionCount = 1;
    let topicIndex = 0;

    while (true) {
      const topic = TOPICS[topicIndex % TOPICS.length];
      console.log(`\nInteraction #${interactionCount}: ${topic}`);

      const groqMessage = await getGroqUserMessage(topic);
      console.log(`Groq User Query: ${groqMessage}`);

      const gaiaResponse = await chatWithGaianet(groqMessage, gaianetToken);
      console.log(`Gaianet Response: ${gaiaResponse}`);

      topicIndex++;
      interactionCount++;

      await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.NORMAL_WAIT * 1000));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the program
main();
