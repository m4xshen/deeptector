import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { checkDeepfake } from "@/utils/factCheck"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

export default function ImageCheckCarousel({
  tweetVideo,
  imageCheckResult
}: {
  tweetVideo: HTMLVideoElement | null
  imageCheckResult: any[]
}) {
  const [videoDeepfakeResult, setVideoDeepfakeResult] = useState<number | null>(
    null
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    ;(async () => {
      const stream = tweetVideo.captureStream()
      const blob = await captureFirstFrame(stream)
      const deepfakeResult = await checkDeepfake(blob)

      setVideoDeepfakeResult(deepfakeResult.type.deepfake)
    })()
  }, [tweetVideo])

  const scrollToImage = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const scrollPosition = index * scrollContainerRef.current.offsetWidth
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth"
      })
    }
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      console.error("IntersectionObserver not supported")
      return
    }

    const options = {
      root: scrollContainerRef.current,
      rootMargin: "0px",
      threshold: 0.5
    }

    const callback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute("data-index"))
          if (!isNaN(index)) {
            setCurrentIndex(index)
          }
        }
      })
    }

    observerRef.current = new IntersectionObserver(callback, options)

    const images =
      scrollContainerRef.current?.querySelectorAll(".image-container")
    images?.forEach((img) => observerRef.current?.observe(img))

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="w-full max-w-md mx-auto">
      <>
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none"
          }}>
          {imageCheckResult.map((image, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full snap-center px-4 image-container"
              data-index={index}>
              <div className="aspect-square relative overflow-hidden mb-4">
                <img
                  src={image.url}
                  alt={`Tweet image ${index + 1}`}
                  className="absolute w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="text-center w-full mt-4">
                {image.aiGeneratedScore === null ? (
                  <div className="flex justify-center items-center text-gray-500">
                    <Loader2 className="animate-spin mr-2" />
                  </div>
                ) : (
                  <AIContentDetector
                    percentage={image.aiGeneratedScore * 100}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4 space-x-2">
          {imageCheckResult.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? "bg-black" : "bg-gray-300"
              }`}
              onClick={() => scrollToImage(index)}
            />
          ))}
        </div>
      </>
      {videoDeepfakeResult && (
        <div className="mt-4">
          這個影片有 <strong>{videoDeepfakeResult * 100}%</strong> 是 deepfake
        </div>
      )}
    </div>
  )
}

const AIContentDetector = ({ percentage }) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
      <div className="flex justify-between">
        <span className="text-sm font-medium">真實</span>
        <span className="text-sm font-medium">AI</span>
      </div>
      <Progress value={percentage} className="h-5" />
      {percentage >= 50 ? (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription>
            有 <strong>{percentage.toFixed(0)}%</strong> 的機率是AI生成
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription>
            僅有 <strong>{percentage.toFixed(0)}%</strong> 的機率是AI生成
          </AlertDescription>
        </Alert>
      )}
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
