import React, { useEffect, useState, useRef } from 'react'
import { SendIcon, SparklesIcon } from 'lucide-react'
import { Spot } from '../data/spots'
interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}
interface ChatPanelProps {
  spots: Spot[]
}
function generateResponse(query: string, spots: Spot[]): string {
  const q = query.toLowerCase()
  if (/^(hi|hello|hey|sup|yo)\b/.test(q)) {
    return `Hey! I can help you find the perfect coworking spot in Toronto. Try asking about quiet places, fast wifi, or the best-rated spots.`
  }
  if (/best|top|highest|recommend/.test(q)) {
    const top = [...spots].sort((a, b) => b.score - a.score).slice(0, 3)
    return `Here are the top-rated spots:\n\n${top.map((s) => `• ${s.name} — ${s.score.toFixed(1)}/10, ${s.amenities.wifi} WiFi, ${s.amenities.noise} noise`).join('\n')}`
  }
  if (/quiet|silent|calm|peaceful/.test(q)) {
    const quiet = spots.filter((s) => s.amenities.noise === 'Quiet')
    if (quiet.length === 0) return `No spots are marked as quiet right now based on reviews.`
    return `Quiet spots:\n\n${quiet.map((s) => `• ${s.name} — ${s.score.toFixed(1)}/10, ${s.amenities.wifi} WiFi, ${s.amenities.outlets} outlets`).join('\n')}`
  }
  if (/wifi|internet|connection|online/.test(q)) {
    const fast = spots.filter((s) => ['Fast', 'Reliable'].includes(s.amenities.wifi))
    if (fast.length === 0) return `No spots have confirmed fast WiFi based on reviews.`
    return `Spots with strong WiFi:\n\n${fast.map((s) => `• ${s.name} — ${s.amenities.wifi} WiFi, ${s.score.toFixed(1)}/10`).join('\n')}`
  }
  if (/outlet|plug|charge|power/.test(q)) {
    const plenty = spots.filter((s) => s.amenities.outlets === 'Plentiful')
    if (plenty.length === 0) return `No spots have confirmed plentiful outlets based on reviews.`
    return `Spots with plenty of outlets:\n\n${plenty.map((s) => `• ${s.name} — ${s.amenities.outlets} outlets, ${s.score.toFixed(1)}/10`).join('\n')}`
  }
  const matchedSpot = spots.find((s) => q.includes(s.name.toLowerCase()))
  if (matchedSpot) {
    const s = matchedSpot
    return `${s.name} — ${s.score.toFixed(1)}/10\n\nWiFi: ${s.amenities.wifi}\nNoise: ${s.amenities.noise}\nOutlets: ${s.amenities.outlets}\n\n${s.aiSummary}`
  }
  return `I can help you find coworking spots in Toronto! Try:\n\n• "What are the best spots?"\n• "Where's quiet?"\n• "Good WiFi spots"\n• "Tell me about Tatsuro's"`
}
export function ChatPanel({ spots }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: `Hey! I'm your WorkBrew assistant. Ask me about any of the ${spots.length || 50} Toronto cafes — try "where's quiet?" or "best WiFi spots".`,
    },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text }
    const response = generateResponse(text, spots)
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: response }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    inputRef.current?.focus()
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  return (
    <div className="w-[320px] h-full flex flex-col bg-background border-r-[0.5px] border-border flex-shrink-0">
      <div className="p-6 border-b-[0.5px] border-border bg-white z-10">
        <div className="flex items-center gap-2 text-text">
          <SparklesIcon size={18} className="text-amber-500" />
          <h1 className="text-lg font-semibold">Spot Assistant</h1>
        </div>
        <p className="text-xs text-muted mt-1">
          Ask about cafes, WiFi, noise, neighborhoods
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#f0ede8] text-text px-3.5 py-2.5 rounded-2xl rounded-br-md' : 'text-text'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t-[0.5px] border-border bg-white">
        <div className="flex items-center gap-2 bg-background rounded-xl border-[0.5px] border-border px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a spot..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-white disabled:opacity-30 transition-opacity hover:bg-[#333]"
          >
            <SendIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
