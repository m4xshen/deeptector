import {
  checkClaim,
  type Claim,
  type FactCheckResponse
} from "@/utils/factCheck"
import { openai } from "@/utils/openai"
import { extractTweetText } from "@/utils/tweet"
import { streamText } from "ai"
import React from "react"

import { Button } from "./ui/button"

export default function TweetOverlay({
  setIsExpanded,
  tweetElement,
  onFactCheck,
  onStreamingSummary,
  onResetSummary,
  setIsLoading,
  setIsStreaming
}: {
  setIsExpanded: (isExpanded: boolean) => void
  tweetElement: Element
  onFactCheck: (result: FactCheckResponse | string) => void
  onStreamingSummary: (summary: string) => void
  onResetSummary: () => void
  setIsLoading: (isLoading: boolean) => void
  setIsStreaming: (isStreaming: boolean) => void
}) {
  const handleFactCheck = async () => {
    setIsExpanded(true)
    onResetSummary()
    setIsLoading(true)
    setIsStreaming(false)

    const tweetText = extractTweetText(tweetElement)
    const result = await checkClaim(tweetText)

    if (!result || Object.keys(result).length === 0) {
      onFactCheck("沒有找到相關的事實查核資料。")
      setIsLoading(false)
      return
    }

    onFactCheck(result)
    const allArticles = await extractAllArticles(result.claims)
    const combinedContent = allArticles.join("\n\n")

    setIsLoading(false)
    setIsStreaming(true)

    let streamingSummary = ""
    const { textStream } = await streamText({
      model: openai("gpt-4"),
      prompt:
        "請使用繁體中文回答 Summarize the misleading or false claims in articles in 3 bullet point, focusing on inaccuracies, misrepresented facts, or biased information. Result should be raw markdown string within each bullet point should be a short sentence within 20 words. Articles: " +
        combinedContent
    })

    for await (const textPart of textStream) {
      streamingSummary += textPart
      onStreamingSummary(streamingSummary)
    }

    setIsStreaming(false)
  }

  return (
    <div className="absolute top-1 right-1 flex flex-col items-end">
      <Button onClick={handleFactCheck} variant="outline">
        查核
      </Button>
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
