import cssText from "data-text:@/style.css"

import "@/style.css"

import { Close, MagnifyingGlass } from "@/components/Icons"
import TweetOverlay from "@/components/TweetOverlay"
import { Skeleton } from "@/components/ui/skeleton"
import { type FactCheckResponse } from "@/utils/factCheck"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import FactCheckTab from "./components/FactCheckTab"
import ImageCheckTab from "./components/ImageCheckTab"
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
  const [imageCheckResult, setImageCheckResult] = useState([])
  const [videoDeepfakeResult, setVideoDeepfakeResult] = useState<number | null>(
    null
  )

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
            setImageCheckResult={setImageCheckResult}
            setVideoDeepfakeResult={setVideoDeepfakeResult}
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

  const FactCheckSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
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
          <Tabs defaultValue="image-check">
            <TabsList className="w-full">
              <TabsTrigger value="image-check" className="w-1/2">
                圖片查核
              </TabsTrigger>
              <TabsTrigger value="fact-check" className="w-1/2">
                事實查核
              </TabsTrigger>
            </TabsList>
            <TabsContent value="fact-check">
              {isLoading ? (
                <FactCheckSkeleton />
              ) : (
                <FactCheckTab
                  factCheckResult={factCheckResult}
                  isStreaming={isStreaming}
                  streamingSummary={streamingSummary}
                />
              )}
            </TabsContent>
            <TabsContent value="image-check">
              <ImageCheckTab
                imageCheckResult={imageCheckResult}
                videoDeepfakeResult={videoDeepfakeResult}
              />
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
