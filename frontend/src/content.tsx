import cssText from "data-text:~style.css"

import "~style.css"

import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import TweetOverlay from "~components/TweetOverlay"
import { type FactCheckResponse } from "~utils/factCheck"

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
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
