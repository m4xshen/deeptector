export const extractTweetText = (tweetElement: Element): string => {
  const tweetTextElement = tweetElement.querySelector(
    '[data-testid="tweetText"]'
  )
  if (tweetTextElement) {
    return Array.from(tweetTextElement.querySelectorAll("span"))
      .map((span) => span.textContent)
      .join(" ")
      .trim()
  }
  return ""
}
