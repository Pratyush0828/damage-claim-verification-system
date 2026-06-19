export function CompletionRing({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="url(#completion)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-all duration-700"
        />
        <defs><linearGradient id="completion"><stop stopColor="#4de1c1" /><stop offset="1" stopColor="#6aa7ff" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-extrabold">{value}%</div>
    </div>
  );
}
