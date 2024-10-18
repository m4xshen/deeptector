import { streamText } from "ai"
import { useState } from "react"

import { checkClaim, type FactCheckResponse } from "~utils/factCheck"
import { openai } from "~utils/openai"
import { extractTweetText } from "~utils/tweet"

export default function TweetOverlay({
  tweetElement,
  onFactCheck,
  onStreamingSummary,
  onResetSummary
}: {
  tweetElement: Element
  onFactCheck: (result: FactCheckResponse | string) => void
  onStreamingSummary: (summary: string) => void
  onResetSummary: () => void
}) {
  const [isStreaming, setIsStreaming] = useState(false)

  const handleFactCheck = async () => {
    onResetSummary() // Reset the summary before starting a new fact-check
    setIsStreaming(true)

    const tweetText = extractTweetText(tweetElement)
    const result = await checkClaim(tweetText)
    if (Object.keys(result).length === 0) {
      onFactCheck("No fact check available")
      setIsStreaming(false)
      return
    }
    onFactCheck(result)

    let summary = ""
    const { textStream } = await streamText({
      model: openai("gpt-4"),
      prompt: "Summarize this tweet in one sentence: " + tweetText
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
        className="p-1 rounded-md bg-blue-500 text-white mb-2"
        onClick={handleFactCheck}
        disabled={isStreaming}>
        {isStreaming ? "Summarizing..." : "Fact check"}
      </button>
    </div>
  )
}
