import React from 'react';
import { getScoreHex, getScoreLabel } from '../../utils/dealHealth';

const HealthGauge = ({ score = 0, size = 180 }) => {
  const stroke = 16;
  const padding = stroke / 2 + 2; // room for rounded stroke caps
  const radius = (size / 2) - padding;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreHex(score);
  const label = getScoreLabel(score);

  // viewBox height: just below the center line (where the arc ends)
  const svgHeight = cy + padding;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={svgHeight}
        viewBox={`0 0 ${size} ${svgHeight}`}
        overflow="visible"
      >
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s' }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="32" fontWeight="bold" fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#94a3b8">
          out of 100
        </text>
      </svg>
      <span className="text-base font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
};

export default HealthGauge;