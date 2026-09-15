export function HeroBackdrop({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const navy = variant === 'dark' ? '#ffffff' : '#08163d';
  const navyOpacity = variant === 'dark' ? 0.12 : 0.08;
  const goldOpacity = variant === 'dark' ? 0.28 : 0.14;
  const nodeOpacity = variant === 'dark' ? 0.22 : 0.1;
  const goldNode = variant === 'dark' ? 0.45 : 0.28;
  const wash = variant === 'dark' ? 0.08 : 0.04;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 820"
      fill="none"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M-40 540C180 480 320 620 520 560C760 486 880 250 1120 310C1280 350 1380 490 1520 430"
        stroke={navy}
        strokeWidth="1.25"
        strokeOpacity={navyOpacity}
      />
      <path
        d="M60 120C280 80 420 240 640 190C860 140 980 40 1220 90C1360 120 1460 80 1540 40"
        stroke={navy}
        strokeWidth="1.1"
        strokeOpacity={navyOpacity * 0.75}
      />
      <path
        d="M-20 280C160 360 340 220 560 300C800 390 940 520 1180 470C1340 436 1460 520 1560 580"
        stroke="#E8A317"
        strokeWidth="1.2"
        strokeOpacity={goldOpacity}
      />
      <path
        d="M200 760C380 680 560 720 740 640C960 542 1080 430 1320 470"
        stroke="#E8A317"
        strokeWidth="1.1"
        strokeOpacity={goldOpacity * 0.7}
      />
      <path
        d="M980 90C1080 160 1188 210 1320 248C1400 272 1480 290 1560 270"
        stroke={navy}
        strokeWidth="1"
        strokeOpacity={navyOpacity * 0.9}
      />
      <circle cx="1088" cy="248" r="210" fill="#E8A317" fillOpacity={wash} />
      {[
        [180, 498],
        [520, 560],
        [880, 250],
        [1120, 310],
        [640, 190],
        [560, 300],
        [1180, 470],
        [740, 640],
        [1320, 248],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill={navy} fillOpacity={nodeOpacity} />
      ))}
      {[
        [320, 620],
        [980, 40],
        [940, 520],
        [1080, 430],
      ].map(([cx, cy]) => (
        <circle key={`g-${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill="#E8A317" fillOpacity={goldNode} />
      ))}
    </svg>
  );
}
