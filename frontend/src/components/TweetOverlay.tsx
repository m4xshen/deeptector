import {
  checkClaim,
  checkDeepfake,
  extractAllArticles,
  type FactCheckResponse
} from "@/utils/factCheck"
import { openai } from "@/utils/openai"
import {
  extractTweetId,
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
  setImageCheckResult,
  setVideoDeepfakeResult
}: {
  setIsExpanded: (isExpanded: boolean) => void
  tweetElement: Element
  onFactCheck: (result: FactCheckResponse | string) => void
  onStreamingSummary: (summary: string) => void
  onResetSummary: () => void
  setIsLoading: (isLoading: boolean) => void
  setIsStreaming: (isStreaming: boolean) => void
  setImageCheckResult: (result: any[]) => void
  setVideoDeepfakeResult: (result: number | null) => void
}) {
  const handleFactCheck = async () => {
    setIsExpanded(true)
    onResetSummary()
    setIsLoading(true)
    setIsStreaming(false)
    setImageCheckResult([])
    setVideoDeepfakeResult(null)

    const tweetText = extractTweetText(tweetElement)
    const tweetImages = extractTweetImages(tweetElement)
    const imageCheckResult = []

    Promise.all(
      tweetImages.map(async (image, _) => {
        try {
          const response = await fetch(
            `https://api.sightengine.com/1.0/check.json?models=genai&api_user=${process.env.PLASMO_PUBLIC_API_USER}&api_secret=${process.env.PLASMO_PUBLIC_API_SECRET}&url=${encodeURIComponent(image)}`
          )
          const data = await response.json()
          const aiGeneratedScore =
            data.status === "success" ? data.type.ai_generated : null
          imageCheckResult.push({
            url: image,
            aiGeneratedScore
          })
        } catch (error) {
          console.error("Error fetching AI data:", error)
        }
      })
    ).then(() => {
      setImageCheckResult(imageCheckResult)
    })

    const tweetVideo = extractTweetVideos(tweetElement)

    async function handleFactCheck() {
      setVideoDeepfakeResult(-1)
      tweetVideo.currentTime = 0
      const stream = tweetVideo.captureStream()
      const blob = await captureFirstFrame(stream)
      const deepfakeResult = await checkDeepfake(blob)

      setVideoDeepfakeResult(deepfakeResult.type.deepfake)
    }

    if (tweetVideo) {
      handleFactCheck()
    }

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
      model: openai("gpt-4o"),
      system: `You are a fact-checking assistant specializing in identifying misleading or false claims in articles. Respond in Traditional Chinese. Summarize misleading or false claims in 3 bullet points, focusing on inaccuracies, misrepresented facts, or biased information. Each bullet point should be a short sentence within 20 words. Provide the result as a raw markdown string without formatting.`,
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

function captureFirstFrame(stream: MediaStream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.srcObject = stream

    video.onloadedmetadata = () => {
      video.play()
      video.pause()
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, "image/jpeg")
    }
    video.onerror = reject
  })
}
