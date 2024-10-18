import { streamText } from "ai"
import cssText from "data-text:~style.css"

import "~style.css"

import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import { checkClaim, type FactCheckResponse } from "~utils/factCheck"
import { openai } from "~utils/openai"
import { extractTweetText } from "~utils/tweet"

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

function TweetOverlay({
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

const PlasmoOverlay = () => {
  const [factCheckResult, setFactCheckResult] = useState<
    FactCheckResponse | string
  >("")
  const [streamingSummary, setStreamingSummary] = useState("")

  const resetSummary = () => {
    setStreamingSummary("")
  }

  useEffect(() => {
    const addOverlayToTweets = () => {
      const tweets = document.querySelectorAll(
        'article[data-testid="tweet"]:not([data-extension-overlay])'
      )
      tweets.forEach((tweet) => {
        tweet.setAttribute("data-extension-overlay", "true")
        const overlayContainer = document.createElement("div")
        tweet.appendChild(overlayContainer)
        createRoot(overlayContainer).render(
          <TweetOverlay
            tweetElement={tweet}
            onFactCheck={setFactCheckResult}
            onStreamingSummary={setStreamingSummary}
            onResetSummary={resetSummary}
          />
        )
      })
    }

    addOverlayToTweets()
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          addOverlayToTweets()
        }
      })
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  if (typeof factCheckResult === "string") {
    return (
      <div className="bg-white text-black fixed top-5 right-5 p-2 rounded-md">
        {factCheckResult}
      </div>
    )
  }

  return (
    <div className="bg-white text-black fixed top-5 right-5 p-2 rounded-md max-w-md overflow-auto max-h-[80vh]">
      {factCheckResult.claims &&
        factCheckResult.claims.map((claim, index) => (
          <div key={index} className="mb-2">
            <div>
              <strong className="font-semibold">Claim:</strong> {claim.text}
            </div>
            {claim.claimReview.map((review, reviewIndex) => (
              <div key={reviewIndex} className="flex flex-col">
                <div>
                  <strong className="font-semibold">Publisher:</strong>{" "}
                  {review.publisher.name || review.publisher.site}
                </div>
                <div>
                  <strong className="font-semibold">Rating:</strong>{" "}
                  {review.textualRating}
                </div>
                <div>
                  <strong className="font-semibold">Date:</strong>{" "}
                  {new Date(review.reviewDate).toDateString()}
                </div>
                <a
                  href={review.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline">
                  Read more
                </a>
              </div>
            ))}
          </div>
        ))}
      {streamingSummary && (
        <div className="mt-4 border-t pt-2">
          <strong className="font-semibold">Summary:</strong> {streamingSummary}
        </div>
      )}
    </div>
  )
}

export default PlasmoOverlay
