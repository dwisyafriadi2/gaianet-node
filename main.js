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
    TEMPERATURE: 0.7,
    MAX_TOKENS: 50,
  },
  GAIA: {
    NAME: "Phi-3-mini-4k-instruct",
  },
};

const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5, // Limit retries to prevent excessive looping
  INITIAL_WAIT: 5,
  MAX_WAIT: 60, // Cap maximum backoff wait time
};

const SYSTEM_PROMPTS = {
  GAIA_GUIDE: "You are a helpful and brief tour guide in Paris, France.",
  GROQ_USER: "You are a tourist asking brief questions about Paris.",
};

const TOPICS = [
  "Best places to visit in Paris?",
  "Top restaurants in Paris?",
  "Famous museums in Paris?",
  "Where to shop in Paris?",
  "History of Eiffel Tower?",
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

// GaiaNet interaction with retries
async function chatWithGaianet(message, authToken, retryCount = RETRY_CONFIG.MAX_ATTEMPTS) {
  let waitTime = RETRY_CONFIG.INITIAL_WAIT;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const headers = createGaianetHeaders(authToken);
      const payload = {
        model: MODEL_CONFIG.GAIA.NAME,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.GAIA_GUIDE },
          { role: "user", content: message },
        ],
        stream: true,
        stream_options: { include_usage: true },
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

      console.log("\nFull GaiaNet Response:", fullResponse);
      return fullResponse;
    } catch (error) {
      console.error(`Error in GaiaNet attempt ${attempt}: ${error.message}`);

      if (attempt < retryCount) {
        console.log(`Retrying in ${waitTime} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

        waitTime = Math.min(waitTime * 2, RETRY_CONFIG.MAX_WAIT); // Exponential backoff
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

      try {
        const gaiaResponse = await chatWithGaianet(topic, gaianetToken);
        console.log(`\nGaianet Response: ${gaiaResponse}`);
      } catch (error) {
        console.error(`\nError during interaction: ${error.message}`);
        console.log("Skipping to the next interaction...");
      }

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
