import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

export default function ImageCheckCarousel({
  tweetImages
}: {
  tweetImages: string[]
}) {
  const [imageData, setImageData] = useState<
    Array<{ url: string; aiGeneratedScore: number | null }>
  >([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const fetchAiData = async () => {
      const initialData = tweetImages.map((url) => ({
        url,
        aiGeneratedScore: null
      }))
      setImageData(initialData)
      await Promise.all(
        tweetImages.map(async (image, index) => {
          try {
            const response = await fetch(
              `https://api.sightengine.com/1.0/check.json?models=genai&api_user=1283281248&api_secret=B3gFhFi3qHJi2N6VBuhCz6B4myMSUeEi&url=${encodeURIComponent(image)}`
            )
            const data = await response.json()
            const aiGeneratedScore =
              data.status === "success" ? data.type.ai_generated : null
            setImageData((prev) => {
              const newData = [...prev]
              newData[index] = { url: image, aiGeneratedScore }
              return newData
            })
          } catch (error) {
            console.error("Error fetching AI data:", error)
          }
        })
      )
    }
    fetchAiData()
  }, [tweetImages])

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
  }, [imageData])

  if (imageData.length === 0) {
    return <div className="text-center py-4">沒有圖片</div>
  }

  return (
    <div className="w-full max-w-md mx-auto">
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
        {imageData.map((image, index) => (
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
                <AIContentDetector percentage={image.aiGeneratedScore * 100} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-4 space-x-2">
        {imageData.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? "bg-black" : "bg-gray-300"
            }`}
            onClick={() => scrollToImage(index)}
          />
        ))}
      </div>
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
