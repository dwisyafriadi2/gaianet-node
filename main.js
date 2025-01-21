import fs from "fs/promises";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();


const API_CONFIG = {
  GAIA_DOMAIN: process.env.GAIA_DOMAIN,
  BASE_URL: process.env.BASE_URL,
  ENDPOINT: "/v1/chat/completions",
};

const API_URLS = {
  GAIANET: `https://${API_CONFIG.GAIA_DOMAIN}.${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINT}`,
};


const API_KEYS = {
  GROQ: process.env.GROQ_API_KEY || "change with your groq api key",
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
  MAX_ATTEMPTS: 20,
  INITIAL_WAIT: 5,
  NORMAL_WAIT: 10,
  ERROR_WAIT: 15,
};

const SYSTEM_PROMPTS = {
  GROQ_USER: "You are a tourist using a tour guide in Paris, France.",
  GAIA_GUIDE:
    "You are a tour guide in Paris, France. Please answer the question from a Paris visitor accurately.",
};

const TOPICS = [
  "Ask about tourist attractions in paris, france",
  "Ask about the best restaurants in Paris",
  "Ask about museums in Paris",
  "Ask about shopping areas in Paris",
  "Ask about historical sites in Paris",
];

const BROWSER_CONFIG = {
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  CHROME_VERSION: "131",
  BRAND_VERSION: "24",
};

const groqClient = new Groq({
  apiKey: API_KEYS.GROQ,
});

async function getAuthToken() {
  try {
    return process.env.GAIANET_AUTH_TOKEN.trim();
  } catch (error) {
    console.error(`Error reading auth token: ${error}`);
    return null;
  }
}

function createGaianetHeaders(authToken) {
  return {
    authority: `${API_CONFIG.GAIA_DOMAIN}.${API_CONFIG.BASE_URL}`,
    method: "POST",
    path: API_CONFIG.ENDPOINT,
    scheme: "https",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    Origin: API_CONFIG.ORIGIN,
    Referer: API_CONFIG.REFERER,
    "Sec-Ch-Ua": `"Google Chrome";v="${BROWSER_CONFIG.CHROME_VERSION}", "Not_A_Brand";v="${BROWSER_CONFIG.BRAND_VERSION}"`,
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": BROWSER_CONFIG.USER_AGENT,
  };
}

async function getGroqUserMessage(prompt) {
  try {
    const completion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.GROQ_USER,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL_CONFIG.GROQ.NAME,
      temperature: MODEL_CONFIG.GROQ.TEMPERATURE,
      max_tokens: MODEL_CONFIG.GROQ.MAX_TOKENS,
      stream: false,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error(`Error in Groq chat: ${error}`);
    throw error;
  }
}

async function chatWithGaianet(
  groqMessage,
  authToken,
  retryCount = RETRY_CONFIG.MAX_ATTEMPTS
) {
  for (let i = 0; i < retryCount; i++) {
    try {
      const headers = createGaianetHeaders(authToken);
      headers["Connection"] = "keep-alive";
      headers["Keep-Alive"] = "max=0";
      headers["Accept"] = "text/event-stream";

      const payload = {
        model: MODEL_CONFIG.GAIA.NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS.GAIA_GUIDE,
          },
          {
            role: "user",
            content: groqMessage,
          },
        ],
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const response = await fetch(API_URLS.GAIANET, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.status === 401) {
        throw new Error(
          "Authentication failed - token may be invalid or expired"
        );
      }

      if (response.status === 504 || response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(
          `Server busy, retrying in ${
            delay / 1000
          } seconds... (Attempt ${i + 1}/${retryCount})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stream = response.body;
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

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
              console.error(`Error parsing response: ${e}`);
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      if (i === retryCount - 1) {
        throw error;
      }
      console.error(`Error in attempt ${i + 1}: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.INITIAL_WAIT * 1000));
    }
  }
}

async function main() {
  try {
    console.clear();
    console.log("Starting Auto Chat Program...");

    const gaianetToken = await getAuthToken();
    if (!gaianetToken) {
      throw new Error("Failed to get Gaianet authorization token");
    }
    console.log("Authentication token loaded successfully");

    let interactionCount = 1;
    let topicIndex = 0;

    while (true) {
      try {
        console.log(`Interaction #${interactionCount}`);

        const currentTopic = TOPICS[topicIndex % TOPICS.length];
        const groqMessage = await getGroqUserMessage(currentTopic);
        console.log(`Groq (as User): ${groqMessage}`);

        console.log("Gaianet Assistant:");
        const gaiaResponse = await chatWithGaianet(groqMessage, gaianetToken);

        interactionCount++;
        topicIndex++;

        console.log("Waiting for next interaction...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.NORMAL_WAIT * 1000));
      } catch (error) {
        console.error(`Error in interaction: ${error}`);
        console.log("Waiting before retry...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.ERROR_WAIT * 1000));
      }
    }
  } catch (error) {
    console.error(`Error in main process: ${error}`);
    console.error("Program terminated due to error");
  }
}

main().catch((error) => console.error(`${error}`));
