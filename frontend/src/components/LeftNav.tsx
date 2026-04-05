import { SearchIcon, BookmarkIcon, CoffeeIcon } from 'lucide-react'

export type NavItem = 'search' | 'saved'

interface LeftNavProps {
  activeItem: NavItem
  onItemClick: (item: NavItem) => void
}

export function LeftNav({ activeItem, onItemClick }: LeftNavProps) {
  const items: { id: NavItem; icon: typeof SearchIcon; label: string }[] = [
    { id: 'search', icon: SearchIcon, label: 'Search' },
    { id: 'saved', icon: BookmarkIcon, label: 'Saved' },
  ]

  return (
    <nav className="w-[140px] h-full flex flex-col bg-background border-r-[0.5px] border-border flex-shrink-0">
      <div className="w-full flex items-center justify-center gap-2 py-5 px-4">
        <CoffeeIcon size={20} className="text-text flex-shrink-0" />
        <span className="text-sm font-semibold tracking-wide text-text">
          WorkBrew
        </span>
      </div>

      <div className="flex flex-col gap-1 mt-2 px-3">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onItemClick(id)}
            className={`relative w-full h-10 flex items-center gap-2.5 px-3 rounded-lg transition-colors ${activeItem === id ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'}`}
            aria-label={label}
          >
            <Icon size={18} className={activeItem === id ? 'text-text' : 'text-muted'} />
            <span className={`text-sm ${activeItem === id ? 'font-medium text-text' : 'text-muted'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
