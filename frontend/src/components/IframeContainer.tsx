import { useState } from 'react'
import { LuExternalLink, LuRefreshCw, LuGlobe } from 'react-icons/lu'

interface IframeContainerProps {
  defaultUrl?: string
}

export default function IframeContainer({ defaultUrl = 'https://www.sportybet.com' }: IframeContainerProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [inputValue, setInputValue] = useState(defaultUrl)
  const [key, setKey] = useState(0)

  const handleRefresh = () => setKey(prev => prev + 1)
  
  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault()
    let newUrl = inputValue.trim()
    if (!newUrl.startsWith('http')) {
      newUrl = 'https://' + newUrl
    }
    setUrl(newUrl)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <form onSubmit={handleLoad} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <LuGlobe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter site URL..."
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-sm focus:border-black/20 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
          >
            Load
          </button>
        </form>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-black"
            title="Refresh frame"
          >
            <LuRefreshCw className="h-4 w-4" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-black"
            title="Open in new tab"
          >
            <LuExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-3xl border border-black/10 bg-black/[0.02]">
        <iframe
          key={key}
          src={url}
          className="h-full w-full"
          title="Game Site"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        />
        
        {/* Same-Origin Policy Warning */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <p className="rounded-full bg-white/80 px-4 py-1 text-[10px] text-black/40 backdrop-blur shadow-sm">
            Note: Some sites may block iframing. If blank, open the site in a new tab and capture that window.
          </p>
        </div>
      </div>
    </div>
  )
}
