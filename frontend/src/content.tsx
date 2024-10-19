import cssText from "data-text:@/style.css"
import Markdown from "markdown-to-jsx"

import "@/style.css"

import { Close, MagnifyingGlass } from "@/components/Icons"
import TweetOverlay from "@/components/TweetOverlay"
import { Skeleton } from "@/components/ui/skeleton"
import { type FactCheckResponse } from "@/utils/factCheck"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import ImageCheckTab from "./components/ImageCheckTab"
import { Card, CardHeader } from "./components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"

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
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [tweetImages, setTweetImages] = useState<string[]>([])

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
            setIsLoading={setIsLoading}
            setIsStreaming={setIsStreaming}
            onExtractImages={(images) => setTweetImages(images)}
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

  const getOgImage = (url: string) => {
    const domain = new URL(url).hostname
    return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
  }

  const FactCheckSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )

  const StreamingSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-[80%]" />
      <Skeleton className="h-4 w-[60%]" />
      <Skeleton className="h-4 w-[70%]" />
    </div>
  )

  return (
    <div
      className={`fixed top-5 right-5 bg-white text-black rounded-lg transition-all duration-300 ease-in-out ${
        isExpanded
          ? "w-[31rem] h-[80vh] p-4 overflow-auto"
          : "w-12 h-12 cursor-pointer"
      }`}
      onClick={!isExpanded ? toggleExpand : undefined}>
      {isExpanded ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleExpand}
            className="ml-auto text-gray-500 hover:text-gray-700">
            <Close />
          </button>
          <Tabs defaultValue="fact-check">
            <TabsList className="w-full">
              <TabsTrigger value="fact-check" className="w-1/2">
                事實查核
              </TabsTrigger>
              <TabsTrigger value="image-check" className="w-1/2">
                圖片查核
              </TabsTrigger>
            </TabsList>
            <TabsContent value="fact-check">
              {isLoading ? (
                <FactCheckSkeleton />
              ) : typeof factCheckResult === "string" ? (
                <div>{factCheckResult}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {factCheckResult.claims &&
                    factCheckResult.claims.map((claim, index) => (
                      <Card
                        key={index}
                        onClick={() =>
                          window.open(claim.claimReview[0].url, "_blank")
                        }
                        className="cursor-pointer hover:bg-gray-100 transition-colors duration-200 min-h-24">
                        <CardHeader className="flex flex-row items-center gap-5">
                          <img
                            src={getOgImage(claim.claimReview[0].url)}
                            className="h-12 rounded border-black"
                          />
                          <div className="flex flex-col">
                            <div>
                              查核單位:{" "}
                              {claim.claimReview[0].publisher.name ||
                                claim.claimReview[0].publisher.site}
                            </div>
                            <div>
                              結果 :{" "}
                              <strong>
                                {claim.claimReview[0].textualRating}
                              </strong>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}

                  <div className="mt-4 border-t pt-2 prose">
                    {isStreaming && streamingSummary === "" ? (
                      <StreamingSkeleton />
                    ) : (
                      streamingSummary && (
                        <Markdown>{streamingSummary}</Markdown>
                      )
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="image-check">
              <ImageCheckTab tweetImages={tweetImages} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="w-full h-full rounded-lg bg-white flex items-center justify-center">
          <MagnifyingGlass />
        </div>
      )}
    </div>
  )
}

export default PlasmoOverlay
