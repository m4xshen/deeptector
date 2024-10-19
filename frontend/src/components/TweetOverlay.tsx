import {
  checkClaim,
  type Claim,
  type FactCheckResponse
} from "@/utils/factCheck"
import { openai } from "@/utils/openai"
import {
  extractTweetImages,
  extractTweetText,
  extractTweetVideos
} from "@/utils/tweet"
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
  setIsStreaming,
  onExtractImages,
  onExtractVideo
}: {
  setIsExpanded: (isExpanded: boolean) => void
  tweetElement: Element
  onFactCheck: (result: FactCheckResponse | string) => void
  onStreamingSummary: (summary: string) => void
  onResetSummary: () => void
  setIsLoading: (isLoading: boolean) => void
  setIsStreaming: (isStreaming: boolean) => void
  onExtractImages: (images: string[]) => void
  onExtractVideo: (video: any) => void
}) {
  const handleFactCheck = async () => {
    setIsExpanded(true)
    onResetSummary()
    setIsLoading(true)
    setIsStreaming(false)

    const tweetText = extractTweetText(tweetElement)
    const tweetImages = extractTweetImages(tweetElement)
    const tweetVideo = extractTweetVideos(tweetElement)

    onExtractImages(tweetImages)
    onExtractVideo(tweetVideo)

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
      model: openai("gpt-4o-mini"),
      system: `You are a fact-checking assistant specializing in identifying misleading or false claims in articles. Respond in Traditional Chinese, but use English for proper nouns. Summarize misleading or false claims in 3 bullet points, focusing on inaccuracies, misrepresented facts, or biased information. Each bullet point should be a short sentence within 20 words. Provide the result as a raw markdown string without formatting.`,
      prompt: `分析以下文章中的誤導或虛假聲明：\n\n${combinedContent}`
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
    const response = await fetch(
      "https://deeptector.onrender.com/api/extract",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
      }
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error extracting content from", url, ":", error)
    return { content: "" }
  }
}
