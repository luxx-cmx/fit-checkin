'use client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getFontSize, getSkin, setSkin as persistSkin, SKINS } from '@/lib/store'

const SkinContext = createContext({ skin: 0, setSkin: () => { }, skins: SKINS })

const SKIN_VIEW = {
    0: {
        bg: 'bg-gray-50',
        glow: 'from-transparent via-transparent to-transparent',
        marks: [],
    },
    1: {
        bg: 'bg-gradient-to-br from-emerald-50 via-lime-50 to-white',
        glow: 'from-emerald-100/70 via-lime-100/50 to-transparent',
        marks: ['🥕', '🍎', '🥦', '🍋'],
    },
    2: {
        bg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-white',
        glow: 'from-amber-100/80 via-orange-100/50 to-transparent',
        marks: ['🐰', '🧸', '🍯', '🍞'],
    },
    3: {
        bg: 'bg-gradient-to-br from-sky-50 via-blue-50 to-white',
        glow: 'from-sky-100/80 via-blue-100/50 to-transparent',
        marks: ['🍽️', '💧', '👣', '✨'],
    },
}

export const useSkin = () => useContext(SkinContext)

export default function SkinProvider({ children }) {
    const [skin, updateSkin] = useState(0)

    useEffect(() => {
        updateSkin(getSkin())
        const applyFontSize = () => {
            document.documentElement.setAttribute('data-syj-font-size', getFontSize())
        }
        applyFontSize()
        window.addEventListener('syj:font-size-changed', applyFontSize)
        return () => window.removeEventListener('syj:font-size-changed', applyFontSize)
    }, [])

    const value = useMemo(() => ({
        skin,
        skins: SKINS,
        setSkin: (nextSkin) => {
            persistSkin(nextSkin)
            updateSkin(Number(nextSkin) || 0)
            window.dispatchEvent(new CustomEvent('syj-skin-change', { detail: Number(nextSkin) || 0 }))
        },
    }), [skin])

    const view = SKIN_VIEW[skin] || SKIN_VIEW[0]

    return (
        <SkinContext.Provider value={value}>
            <div className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${view.bg}`}>
                {skin !== 0 && (
                    <>
                        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${view.glow}`} />
                        <div className="pointer-events-none absolute inset-0 opacity-25">
                            {view.marks.map((mark, index) => (
                                <span
                                    key={`${mark}-${index}`}
                                    className="absolute select-none text-4xl blur-[0.2px]"
                                    style={{
                                        top: `${8 + index * 19}%`,
                                        left: index % 2 === 0 ? `${5 + index * 7}%` : '82%',
                                        transform: `rotate(${index % 2 === 0 ? -12 : 10}deg)`,
                                    }}
                                >
                                    {mark}
                                </span>
                            ))}
                        </div>
                    </>
                )}
                <div className="relative z-10 min-h-screen">{children}</div>
            </div>
        </SkinContext.Provider>
    )
}