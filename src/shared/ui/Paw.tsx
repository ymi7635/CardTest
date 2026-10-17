export default function Paw({ className = '' }: { className?: string }) {
  return (
    <svg className={`paw ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="16.2" rx="4.8" ry="4" />
      <ellipse cx="5.4" cy="10.6" rx="2.1" ry="2.7" transform="rotate(-18 5.4 10.6)" />
      <ellipse cx="9.6" cy="6.6" rx="2.1" ry="2.8" transform="rotate(-6 9.6 6.6)" />
      <ellipse cx="14.4" cy="6.6" rx="2.1" ry="2.8" transform="rotate(6 14.4 6.6)" />
      <ellipse cx="18.6" cy="10.6" rx="2.1" ry="2.7" transform="rotate(18 18.6 10.6)" />
    </svg>
  )
}
