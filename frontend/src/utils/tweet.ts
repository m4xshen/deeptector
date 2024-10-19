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
    .map((img) => {
      const src = img.getAttribute("src")
      if (src) {
        // Parse the URL
        const url = new URL(src)

        // Get the format from the query parameters
        const format = url.searchParams.get("format")

        // Remove query parameters and hash
        url.search = ""
        url.hash = ""

        // Get the base URL without query parameters
        let cleanSrc = url.toString()

        // Add the format as a file extension if available
        if (format) {
          cleanSrc += `.${format}`
        }

        return cleanSrc
      }
      return null
    })
    .filter((src): src is string => src !== null)
}
