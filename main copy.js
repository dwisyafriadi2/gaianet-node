import fs from "fs/promises";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const CONFIG = {
  BASE_URL: process.env.BASE_URL || "gaia.domains",
  ENDPOINT: "/v1/chat/completions",
};

async function getApiKey() {
  try {
    const apiKey = process.env.API_KEY || await fs.readFile("api-groq.txt", "utf8");
    return apiKey.trim();
  } catch (error) {
    console.error("Error reading API key:", error);
    return null;
  }
}

async function getNodeId() {
  try {
    const nodeId = process.env.NODE_ID || await fs.readFile("nodeid.txt", "utf8");
    return nodeId.trim();
  } catch (error) {
    console.error("Error reading Node ID:", error);
    return null;
  }
}

function createHeaders(apiKey) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function chatWithGaianet(message, apiKey, nodeId) {
  const apiUrl = `https://${nodeId}.${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`;
  const headers = createHeaders(apiKey);

  const payload = {
    model: "Phi-3-mini-4k-instruct",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error during API request:", error);
    throw error;
  }
}

async function autoInteraction() {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API key not found.");

    const nodeId = await getNodeId();
    if (!nodeId) throw new Error("Node ID not found.");

    const topics = [
      "What are the top hidden gems to visit in Paris?",
      "Can you recommend a day itinerary for exploring Paris?",
      "What are the best places to experience Parisian culture?",
      "Which neighborhoods in Paris are ideal for first-time visitors?",
      "What are some must-try local dishes in Paris?",
      "What is the history of the Eiffel Tower?",
      "Are there any free activities to do in Paris?",
      "What are the best ways to get around Paris as a tourist?",
      "Which events or festivals happen in Paris during the summer?",
      "Where can I find the best views of the city in Paris?",
    ];

    let interactionCount = 10000;

    for (const topic of topics) {
      console.log(`Interaction #${interactionCount}`);
      console.log(`User: ${topic}`);

      const response = await chatWithGaianet(topic, apiKey, nodeId);

      console.log(`Gaianet: ${response}`);
      interactionCount++;

      // Add a delay between interactions
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log("All interactions completed.");
  } catch (error) {
    console.error("Error in auto interaction:", error);
  }
}

(async function main() {
  console.clear();
  console.log("Starting Auto Interaction with GaiaNet Node...");
  await autoInteraction();
  console.log("Auto Interaction completed.");
})();
