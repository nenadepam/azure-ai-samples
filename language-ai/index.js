const axios = require("axios");
const readline = require("readline");
const dotenv = require("dotenv");

dotenv.config();

const url = process.env.URL;
const apiKey = process.env.API_KEY;
const projectName = process.env.PROJECT_NAME;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion() {
  rl.question("Enter your question: ", async (question) => {
    const payload = {
      top: 3,
      question: question,
      confidenceScoreThreshold: 0.8,
    };

    try {
      const { data } = await axios.post(
        `${url}?projectName=${projectName}&api-version=2021-10-01&deploymentName=production`,
        payload,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("Answer:", data.answers[0]?.answer || "No answer found.");
    } catch (error) {
      console.error("Error fetching answer:", error);
    }

    askQuestion(); // Prompt for another question
  });
}

// Start the CLI prompt
askQuestion();
