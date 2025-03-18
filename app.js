require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static("public"));

// Bot API
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateWebsite() {
  try {
    const prompt = `create another nice interesting to play new web game ( not color picker or catch game create new games everytime ) using html,css and js in one file a single-page HTML web game based on the following description. 
    Include inline CSS styling. Make it mobile responsive. Ensure the code is well-formatted and includes essential 
    HTML tags (<!DOCTYPE html>, <html>, <head>, <body>). Focus on clean, readable, and functional HTML. 
    Do not include external CSS or Javascript and it should be included in <script> tag inside <body>. 
    and Return ONLY valid HTML, nothing else.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText;
  } catch (error) {
    console.error("Error generating web game:", error);
    return null;
  }
}

async function extractHtml(htmlString) {
  const start = htmlString.indexOf("<!DOCTYPE html>");
  const end = htmlString.lastIndexOf("</html>");

  if (start === -1 || end === -1) {
    return null;
  }

  return htmlString.substring(start, end + 7);
}

async function saveWebsiteToFile(chatId, htmlContent) {
  const filename = `${chatId}.html`;
  const filePath = path.join(__dirname, "public", filename);
  try {
    await fs.writeFile(filePath, htmlContent);
    return `${process.env.BASE_URL}/${filename}`;
  } catch (error) {
    console.error("Error saving a web game to file:", error);
    return null;
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function startMenu(msg) {
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [[{ text: "Generate Web Game 📲" }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    }),
  };

  bot.sendMessage(msg.chat.id, "Choose an option below:", opts);
}

bot.onText(/\/start/, (msg) => {
  console.log("=============" + msg.chat.id);
  startMenu(msg);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (userMessage === "Generate Web Game 📲") {
    await bot.sendMessage(chatId, "Generating web game... Please wait ⏳");

    const generatedHtml = await generateWebsite();

    if (generatedHtml) {
      const htmlContent = await extractHtml(generatedHtml);

      if (htmlContent) {
        const websiteUrl = await saveWebsiteToFile(chatId, htmlContent);

        if (websiteUrl) {
          bot.sendMessage(
            chatId,
            `Your Web Game is ready 🎉 visit :\n\n ${websiteUrl}`
          );
        } else {
          bot.sendMessage(
            chatId,
            "🙁 Failed to save the web game. Please try again."
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          "🙁 Could not extract HTML from the generated content. Please try again."
        );
      }
    } else {
      bot.sendMessage(
        chatId,
        "🙁 Failed to generate the web game. Please provide a more detailed description."
      );
    }
  }
});
