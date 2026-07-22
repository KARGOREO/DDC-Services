
const onNotificationAPI = async (text) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8931294700:AAGOcnzMwRwmgJfOQiV3URxbr1pQzYgYYXc";
  console.log("TELEGRAM_TOKEN", TELEGRAM_TOKEN);
  const CHAT_ID = process.env.CHAT_ID || "-5129927659";
  console.log("CHAT_ID", CHAT_ID);
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const message = `${text}`;

  try {
    // await fetch(url, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     chat_id: CHAT_ID,
    //     text: message,
    //     parse_mode: "Markdown",
    //   }),
    // });
    return true;
  } catch (error) {
    return true;
  }
};
export default onNotificationAPI;
