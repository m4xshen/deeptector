import { streamText } from "ai"
import { useState } from "react"

import {
  checkClaim,
  type Claim,
  type FactCheckResponse
} from "~utils/factCheck"
import { openai } from "~utils/openai"
import { extractTweetText } from "~utils/tweet"

export default function TweetOverlay({
  setIsExpanded,
  tweetElement,
  onFactCheck,
  onStreamingSummary,
  onResetSummary
}: {
  setIsExpanded: (isExpanded: boolean) => void
  tweetElement: Element
  onFactCheck: (result: FactCheckResponse | string) => void
  onStreamingSummary: (summary: string) => void
  onResetSummary: () => void
}) {
  const [isStreaming, setIsStreaming] = useState(false)

  const handleFactCheck = async () => {
    setIsExpanded(true)
    onResetSummary()
    setIsStreaming(true)
    const tweetText = extractTweetText(tweetElement)
    const result = await checkClaim(tweetText)
    if (!result || result.claims.length === 0) {
      onFactCheck("No fact check available")
      setIsStreaming(false)
      return
    }
    onFactCheck(result)

    const allArticles = await extractAllArticles(result.claims)

    const combinedContent = allArticles.join("\n\n")

    let summary = ""
    const { textStream } = await streamText({
      model: openai("gpt-4"),
      prompt:
        "Summarize the misleading or false claims in articles in bullet point, focusing on inaccuracies, misrepresented facts, or biased information. Result should be raw markdown string within each bullet point within 20 words. Articles: " +
        combinedContent
    })
    for await (const textPart of textStream) {
      summary += textPart
      onStreamingSummary(summary)
    }
    setIsStreaming(false)
  }

  return (
    <div className="absolute top-1 right-1 flex flex-col items-end">
      <button
        className="p-1 rounded-md bg-white text-black mb-2"
        onClick={handleFactCheck}
        disabled={isStreaming}>
        {isStreaming ? "Summarizing..." : "Fact check"}
      </button>
    </div>
  )
}

async function extractAllArticles(claims: Claim[]): Promise<string[]> {
  const articlePromises = claims.flatMap((claim) =>
    claim.claimReview.map((review) => extractContent(review.url))
  )

  const articles = await Promise.all(articlePromises)
  return articles
    .map((article) => article.content)
    .filter((content) => content !== "")
}

async function extractContent(url: string): Promise<{ content: string }> {
  try {
    const response = await fetch("https://deeptector.onrender.com/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: url })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error extracting content from", url, ":", error)
    return { content: "" }
  }
}
