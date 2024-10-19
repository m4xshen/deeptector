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

export const extractTweetImages = (tweetElement: Element): string[] => {
  const imageElements = tweetElement.querySelectorAll('img[alt="Image"]')
  return Array.from(imageElements)
    .map((img) => img.getAttribute("src"))
    .filter((src): src is string => src !== null)
}
