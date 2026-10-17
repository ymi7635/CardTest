// 把文字拆成單字 span，給 GSAP 做逐字動畫
export default function SplitChars({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`split ${className}`} aria-label={text}>
      {[...text].map((c, i) => (
        <span className="ch" aria-hidden="true" key={i}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  )
}
