// 地球儀的經緯線（卡面右側的細線裝飾）。只算一次，兩個卡面共用。
const LINES = (() => {
  const out = [<circle key="outline" cx="100" cy="100" r="98" />, <line key="axis" x1="100" y1="2" x2="100" y2="198" />]
  for (let k = 1; k <= 5; k++) {
    out.push(<ellipse key={`meridian${k}`} cx="100" cy="100" rx={98 * Math.cos((k * Math.PI) / 12)} ry="98" />)
  }
  for (const latitude of [-60, -40, -20, 0, 20, 40, 60]) {
    const rad = (latitude * Math.PI) / 180
    const rx = 98 * Math.cos(rad)
    out.push(<ellipse key={`parallel${latitude}`} cx="100" cy={100 + 98 * Math.sin(rad)} rx={rx} ry={rx * 0.22} />)
  }
  return out
})()

export default function Globe({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true">
      <g transform="rotate(-16 100 100)">{LINES}</g>
    </svg>
  )
}
