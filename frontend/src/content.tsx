import cssText from "data-text:~style.css"

import "~style.css"

import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import { Close, MagnifyingGlass } from "~components/Icons"
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
  const [isExpanded, setIsExpanded] = useState(false)

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
            setIsExpanded={setIsExpanded}
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className={`fixed top-5 right-5 bg-white text-black rounded-lg transition-all duration-300 ease-in-out ${
        isExpanded
          ? "w-80 h-[80vh] p-4 overflow-auto"
          : "w-12 h-12 cursor-pointer"
      }`}
      onClick={!isExpanded ? toggleExpand : undefined}>
      {isExpanded ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Fact Check Results</h2>
            <button
              onClick={toggleExpand}
              className="text-gray-500 hover:text-gray-700">
              <Close />
            </button>
          </div>
          {typeof factCheckResult === "string" ? (
            <div>{factCheckResult}</div>
          ) : (
            <>
              {factCheckResult.claims &&
                factCheckResult.claims.map((claim, index) => (
                  <div key={index} className="mb-4">
                    <div className="font-semibold">Claim: {claim.text}</div>
                    {claim.claimReview.map((review, reviewIndex) => (
                      <div key={reviewIndex} className="ml-4 mt-2">
                        <div>
                          Publisher:{" "}
                          {review.publisher.name || review.publisher.site}
                        </div>
                        <div>Rating: {review.textualRating}</div>
                        <div>
                          Date: {new Date(review.reviewDate).toDateString()}
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
                  <strong className="font-semibold">Summary:</strong>{" "}
                  {streamingSummary}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="w-full h-full rounded-lg bg-white flex items-center justify-center">
          <MagnifyingGlass />
        </div>
      )}
    </div>
  )
}

export default PlasmoOverlay
